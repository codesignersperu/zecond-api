import {
  BadRequestException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Database } from 'src/db/types';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DB_CONNECTION } from 'src/db/db-connection';
import {
  type Address,
  bids,
  products,
  subscriptionPlans,
  users,
} from 'src/db/schemas';
import { AddressesService } from 'src/app/addresses/addresses.service';
import { OrdersService } from 'src/app/orders/orders.service';
import { UsersService } from 'src/app/users/users.service';
import { StripeService as DashboardStripeService } from 'src/dashboard/stripe/stripe.service';
import { ApiResponse } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';
import {
  CustomLineItem,
  StipeOrderSessionMetaData,
  StipeSubscriptionSessionMetaData,
} from './types';
import { FREE_PLAN_ID } from 'src/lib/constants';
import { StoreConfigService } from '../store-config/services';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly configService: ConfigService,
    private readonly addressesService: AddressesService,
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly dashboardStripeService: DashboardStripeService,
    private readonly storeConfigService: StoreConfigService,
  ) {
    this.stripe = new Stripe(configService.getOrThrow('STRIPE_SECRET'), {
      apiVersion: '2025-07-30.basil',
    });
  }

  async findOrCreateUser(userId: number) {
    const [user] = await this.db
      .select({
        id: users.id,
        name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        email: users.email,
        phone: users.phoneNumber,
        stripeCustomerId: users.stripeCustomerId,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (user.stripeCustomerId) {
      const customer = await this.stripe.customers.list({
        email: user.email,
        limit: 1,
      });

      return customer.data[0];
    }

    let userAddress: Address | undefined;

    try {
      let res = await this.addressesService.findPrimary(userId);
      userAddress = res.data;
    } catch (e) {}

    const customer = await this.stripe.customers.create({
      name: user.name,
      email: user.email,
      phone: user.phone || undefined,
      address: userAddress
        ? {
            line1: `${userAddress.exteriorReference}, ${userAddress.street}, ${userAddress.neighborhood}, ${userAddress.city}`,
            city: userAddress.municipality,
            state: userAddress.state,
            country: userAddress.country,
            postal_code: userAddress.postalCode.toString(),
          }
        : undefined,
      metadata: {
        appUserId: user.id,
      },
    });
    await this.db
      .update(users)
      .set({ stripeCustomerId: customer.id })
      .where(eq(users.id, userId));

    return customer;
  }

  async subscribeUserToFreePlan(userId: number) {
    const customer = await this.findOrCreateUser(userId);

    const [plan] = await this.db
      .select({
        stripePriceId: subscriptionPlans.stripePriceId,
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.planId, FREE_PLAN_ID));

    if (!plan) throw new Error('Plan not found, id: ' + FREE_PLAN_ID);

    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: plan.stripePriceId, quantity: 1 }],
      expand: ['latest_invoice.payment_intent'],
    });

    await this.usersService.createUserSubscription(
      userId,
      FREE_PLAN_ID,
      subscription.id,
      'active',
      'paid',
    );
  }

  async findOrCreateSetupIntent(userId: number) {
    const customer = await this.findOrCreateUser(userId);

    const intentRes = await this.stripe.setupIntents.list({
      customer: customer.id,
      limit: 1,
    });

    const intent = intentRes.data[0];

    if (intent) return intent;

    const newIntent = await this.stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'on_session',
    });

    await newIntent;
  }

  async attachPaymentMethodToCustomer(userId: number, paymentMethodId: string) {
    try {
      const customer = await this.findOrCreateUser(userId);

      const usersPaymentMethods = await this.stripe.paymentMethods.list({
        customer: customer.id,
      });

      const primary = usersPaymentMethods.data.length === 0;

      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      if (primary) {
        await this.stripe.customers.update(customer.id, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      }
    } catch (error) {
      console.error(
        `Error attaching payment method ${paymentMethodId} to customer ${userId}:`,
        error,
      );
      throw error;
    }
  }

  async createPaymentIntent(amount: number) {}

  constructEventFromPayload(signature: string, payload: Buffer) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');

    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  async handleWebhookEvent(event: Stripe.Event) {
    // TODO: check for these events for subscriptions
    // invoice.payment_succeeded
    // invoice.payment_failed
    // customer.subscription.updated

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.async_payment_succeeded':
        if (event.data.object.metadata?.type === 'order') {
          await this.ordersService.handleOrder(
            event.type,
            event.data.object as any,
          );
        } else if (event.data.object.metadata?.type === 'subscription') {
          await this.usersService.handleSubscriptionUpdate(
            event.type,
            event.data.object as any,
          );
        }
        break;
      default:
        break;
    }

    return { success: true };
  }

  async createCheckoutSession(
    userId: number,
    productIds: number[],
    addressId: number,
    promoCode?: string,
  ): ApiResponse<{
    checkoutSessionClientSecret: string | null;
  }> {
    // eliminating any duplicates
    productIds = [...new Set(productIds)];

    const addressExists = await this.addressesService.checkExistance({
      id: addressId,
      notThrow: true,
    });
    if (!addressExists)
      throw new BadRequestException('no address againts provided address-id');

    const customer = await this.findOrCreateUser(userId);

    const _products = await this.db.query.products.findMany({
      where: and(
        inArray(products.id, productIds),
        inArray(products.status, ['live', 'auction_ended']),
      ),
      columns: {
        id: true,
        title: true,
        price: true,
        isAuction: true,
      },
      with: {
        images: { columns: { url: true } },
        seller: {
          columns: {
            id: true,
          },
        },
        bids: {
          columns: {
            amount: true,
            bidderId: true,
          },
          limit: 1,
          orderBy: desc(bids.createdAt),
        },
      },
    });

    if (!_products.length)
      throw new BadRequestException('No Products To Checkout');

    _products.forEach((product) => {
      if (product.seller?.id === userId)
        throw new BadRequestException('You cannot checkout your own listings');
      if (product.isAuction && product.bids[0].bidderId !== userId)
        throw new BadRequestException(
          'You did not win the auction you are trying to checkout',
        );
    });

    let promoId: string | null = null;

    if (promoCode) {
      try {
        let res = await this.dashboardStripeService.getPromotionCodes({
          code: promoCode.toUpperCase(),
          for: 'products',
        });
        if (res.data.length && res.data[0].status.usable)
          promoId = res.data[0].id;
      } catch (e) {}
    }

    let lineItems: CustomLineItem[] = _products.map((v) => ({
      price_data: {
        currency: 'mxn',
        product_data: {
          images: v.images.map(
            (v) => this.configService.getOrThrow('APP_URL') + v.url,
          ),
          name: v.title,
          metadata: {
            productId: v.id.toString(),
          },
        },
        unit_amount: (v.isAuction ? v.bids[0].amount : v.price) * 100,
      },
      quantity: 1,
    }));

    const sessionMetadata: StipeOrderSessionMetaData = {
      type: 'order',
      addressId: addressId.toString(),
      buyerId: userId.toString(),
      productIds: _products.map((v) => v.id).join(','),
    };

    const appConfig = await this.storeConfigService.getAppConfig();

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: lineItems,
      discounts: promoId ? [{ promotion_code: promoId }] : undefined,
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: 'Envío estándar', // Standard Shipping,
            fixed_amount: {
              currency: 'mxn',
              amount: appConfig.deliveryFee * 100,
            },
            delivery_estimate: {
              minimum: {
                unit: 'business_day',
                value: 3,
              },
              maximum: {
                unit: 'business_day',
                value: 7,
              },
            },
          },
        },
      ],
      metadata: sessionMetadata as any,
      currency: 'mxn',
      mode: 'payment',
      ui_mode: 'custom',
      locale: 'es',
      return_url:
        this.configService.getOrThrow('FRONTEND_URL') +
        '/order-placed?sessionId={CHECKOUT_SESSION_ID}',
    });

    // DEBUG
    // console.log(JSON.stringify(session, null, 4));

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'session created successfully',
      data: {
        checkoutSessionClientSecret: session.client_secret,
      },
    };
  }

  async createSubscriptionSession(
    userId: number,
    planId: string,
  ): ApiResponse<{
    subscriptionSessionClientSecret: string | null;
  }> {
    const [plan] = await this.db
      .select({
        planId: subscriptionPlans.planId,
        priceId: subscriptionPlans.stripePriceId,
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.planId, planId));

    if (!plan) throw new NotFoundException('Plan not found');

    const customer = await this.findOrCreateUser(userId);

    const sessionMetadata: StipeSubscriptionSessionMetaData = {
      type: 'subscription',
      planId: planId,
      userId: userId.toString(),
    };

    const session = await this.stripe.checkout.sessions.create({
      customer: customer.id,
      currency: 'mxn',
      mode: 'subscription',
      ui_mode: 'custom',
      locale: 'es',
      payment_method_collection: 'always',
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      metadata: sessionMetadata as any,
      return_url:
        this.configService.getOrThrow('FRONTEND_URL') +
        '/subscription-checkout/successful?session-id={CHECKOUT_SESSION_ID}',
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'session created successfully',
      data: {
        subscriptionSessionClientSecret: session.client_secret,
      },
    };
  }

  async updateCheckoutSession(
    id: string,
    metadata: StipeOrderSessionMetaData | StipeSubscriptionSessionMetaData,
  ) {
    await this.stripe.checkout.sessions.update(id, {
      metadata: metadata as any,
    });
  }

  async getCheckoutSessionMetaData(
    id: string,
  ): Promise<StipeOrderSessionMetaData | StipeSubscriptionSessionMetaData> {
    const res = await this.stripe.checkout.sessions.retrieve(id);

    return res.metadata as any as
      | StipeOrderSessionMetaData
      | StipeSubscriptionSessionMetaData;
  }

  async getSubscription(subscriptionId: string) {
    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);

    return subscription;
  }
}
