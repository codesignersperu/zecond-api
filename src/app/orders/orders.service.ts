import {
  BadRequestException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { UpdateOrderDto } from './DTOs';
import type { StipeOrderSession } from 'src/app/stripe/types';
import { DB_CONNECTION } from 'src/db/db-connection';
import { Database } from 'src/db/types';
import {
  orders,
  type Order,
  orderItems,
  type OrderItem,
  cartItems,
  products,
  bids,
  transactions,
} from 'src/db/schemas';
import { StripeService } from 'src/app/stripe/stripe.service';
import { and, desc, eq, inArray, SQL, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { ApiResponse } from 'src/lib/types';
import { OrderInResponse } from './types';
import { ApiStatus } from 'src/lib/enums';
import { safeParseFloat, safeParseInt } from 'src/lib/utils';
import { StripeService as DashboardStripeService } from 'src/dashboard/stripe/stripe.service';
import { OrdersService as DashboardOrdersService } from 'src/dashboard/orders/orders.service';
import { StoreConfigService } from 'src/app/store-config/services';
import { InternalRevenueService as DashboardInternalRevenueService } from 'src/dashboard/revenue/services';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
    private readonly dashboardStripeService: DashboardStripeService,
    private readonly dashboardOrdersService: DashboardOrdersService,
    private readonly storeConfigService: StoreConfigService,
    private readonly internalRevenueService: DashboardInternalRevenueService,
  ) {}

  /**
   * `handleOrder()` basically runs on stripe webhook. places an order on checkout. manages statuses later on.
   *
   * @param eventType
   * @param StipeOrderSession
   */
  async handleOrder(
    eventType: Stripe.Event.Type,
    checkoutSession: StipeOrderSession,
  ) {
    // Firstly, handle expire session event
    // we wanna check if the order exists, we're gonna change its status
    if (eventType === 'checkout.session.expired') {
      const orderId = checkoutSession.metadata.orderId;

      if (orderId)
        await this.db
          .update(orders)
          .set({ status: 'canceled', paymentStatus: 'unpaid' })
          .where(eq(orders.id, safeParseInt(orderId)));

      return;
    }

    let order: Order | undefined;

    // POV: order is just placed
    if (!checkoutSession.metadata.orderId) {
      order = await this.db.transaction(async (tx) => {
        const storeConfig = await this.storeConfigService.getAppConfig();

        // 1: Get Order Products
        const _productIds = checkoutSession.metadata.productIds
          .split(',')
          .map((v) => safeParseInt(v));

        const _orderProducts = await tx.query.products.findMany({
          where: inArray(products.id, _productIds),
          columns: {
            id: true,
            price: true,
            isAuction: true,
          },
          with: {
            seller: {
              columns: { id: true },
              with: {
                balance: {
                  columns: {
                    id: true,
                  },
                },
              },
            },
            bids: {
              columns: {
                amount: true,
              },
              limit: 1,
              orderBy: desc(bids.createdAt),
            },
          },
        });

        if (!_orderProducts.length)
          throw new Error(
            'No products to place order. stripe session: ' + checkoutSession.id,
          );

        // 2: insert order
        const orderDiscountInfo: Record<string, any> = {
          discountCode: null,
          discountType: null,
          discountAmount: null,
        };

        if (checkoutSession.discounts?.length) {
          const record = checkoutSession.discounts[0];
          if (record.promotion_code) {
            try {
              const res =
                await this.dashboardStripeService.getPromotionCodeById(
                  record.promotion_code.toString(),
                );
              orderDiscountInfo.discountCode = res.data.code;
              orderDiscountInfo.discountType = res.data.coupon.percentOff
                ? 'percent'
                : 'amount';
              orderDiscountInfo.discountAmount = res.data.coupon.percentOff
                ? res.data.coupon.percentOff
                : res.data.coupon.amountOff;
            } catch (e) {}
          }
        }

        const orderSubTotal = _orderProducts.reduce(
          (acc, product) =>
            acc + (product.isAuction ? product.bids[0].amount : product.price),
          0,
        );

        const orderTotal = checkoutSession?.amount_total
          ? checkoutSession?.amount_total / 100
          : 0;

        const [order] = await tx
          .insert(orders)
          .values({
            buyerId: safeParseInt(checkoutSession.metadata.buyerId),
            shippingAddressId: safeParseInt(checkoutSession.metadata.addressId),
            subTotal: orderSubTotal,
            total: orderTotal,
            stripePaymentId: checkoutSession.payment_intent
              ? checkoutSession.payment_intent.toString()
              : null,
            shippingCost: ((v) => (v ? v / 100 : 0))(
              checkoutSession.shipping_cost?.amount_total,
            ),
            ...orderDiscountInfo,
          })
          .returning();

        // 3: Generate transactions
        for (const product of _orderProducts) {
          const commissionPercent = product.isAuction
            ? storeConfig.auctionCommissionPercentage
            : 0;

          const price = product.isAuction
            ? product.bids[0].amount
            : product.price;

          let platformCommission = (price * commissionPercent) / 100;
          let usersSale = price - platformCommission;

          // Users transaction
          await this.internalRevenueService.createTransaction({
            txDetails: {
              for: 'user',
              type: 'order',
              userId: product.seller.id,
              orderId: order.id,
              productId: product.id,
              amount: usersSale,
              statusToSet: 'processing',
            },
            type: 'locked',
            dbTx: tx,
          });

          if (platformCommission) {
            // Platform Transaction
            await this.internalRevenueService.createTransaction({
              txDetails: {
                for: 'platform',
                type: 'order',
                orderId: order.id,
                productId: product.id,
                amount: platformCommission,
                statusToSet: 'processing',
              },
              type: 'locked',
              dbTx: tx,
            });
          }
        }

        const _orderItems: Pick<
          OrderItem,
          'orderId' | 'productId' | 'price' | 'quantity'
        >[] = _orderProducts.map((v) => ({
          orderId: order.id,
          productId: v.id,
          price: v.isAuction ? v.bids[0].amount : v.price,
          quantity: 1,
        }));

        await tx.insert(orderItems).values(_orderItems);

        // 4: remove item from user's cart
        await tx
          .delete(cartItems)
          .where(
            and(
              eq(
                cartItems.userId,
                safeParseInt(checkoutSession.metadata.buyerId),
              ),
              inArray(cartItems.productId, _productIds),
            ),
          );

        // 5: update checkout session's metadata
        await this.stripeService.updateCheckoutSession(checkoutSession.id, {
          ...checkoutSession.metadata,
          orderId: order.id.toString(),
        });

        return order;
      });
    } else {
      order = await this.db.query.orders.findFirst({
        where: eq(orders.id, safeParseInt(checkoutSession.metadata.orderId)),
      });
      if (!order) throw new Error('order not found');
    }

    // Payment Succeeds
    if (
      eventType === 'checkout.session.completed' ||
      eventType === 'checkout.session.async_payment_succeeded'
    ) {
      if (order.paymentStatus !== 'paid') {
        await this.db.transaction(async (tx) => {
          // 1: update order's statuses
          await tx
            .update(orders)
            .set({
              status:
                order.status === 'processing_payment' ? 'placed' : order.status,
              paymentStatus: 'paid',
            })
            .where(eq(orders.id, order.id));

          // 2: update products status
          const _orderItems = await tx.query.orderItems.findMany({
            where: eq(orderItems.orderId, order.id),
          });

          await tx
            .update(products)
            .set({ status: 'sold' })
            .where(
              inArray(
                products.id,
                _orderItems.map((v) => v.productId),
              ),
            );

          // 3: Update transactions status
          const trxs = await tx.query.transactions.findMany({
            where: and(eq(transactions.orderId, order.id)),
            columns: { id: true, for: true },
          });

          for (let trx of trxs) {
            if (trx.for === 'user') {
              await this.internalRevenueService.updateTransaction({
                txDetails: {
                  transactionId: trx.id,
                  statusToUpdate: 'pending_clearance',
                },
                dbTx: tx,
              });
            }
            if (trx.for === 'platform') {
              await this.internalRevenueService.updateTransaction({
                txDetails: {
                  transactionId: trx.id,
                  statusToUpdate: 'succeeded',
                },
                balanceUpdate: {
                  crossTransfer: 'locked_to_available',
                },
                dbTx: tx,
              });
            }
          }
        });
      }
    }

    // Payment Fails
    // TODO: discuss with client what happens when payment fails for both regular & auctioned products
    if (eventType === 'checkout.session.async_payment_failed') {
      if (order.status !== 'canceled') {
        await this.db.transaction(async (tx) => {
          // 1: update order's statuses
          await tx
            .update(orders)
            .set({ status: 'canceled', paymentStatus: 'failed' })
            .where(eq(orders.id, order.id));

          // 2: update products status
          const _orderItems = await tx.query.orderItems.findMany({
            where: eq(orderItems.orderId, order.id),
          });

          await tx
            .update(products)
            .set({ status: 'live' })
            .where(
              inArray(
                products.id,
                _orderItems.map((v) => v.productId),
              ),
            );

          // 3: Update transactions status
          const trxs = await tx.query.transactions.findMany({
            where: and(eq(transactions.orderId, order.id)),
            columns: { id: true, for: true },
          });

          for (let trx of trxs) {
            if (trx.for === 'user') {
              await this.internalRevenueService.updateTransaction({
                txDetails: {
                  transactionId: trx.id,
                  statusToUpdate: 'payment_failed',
                },
                balanceUpdate: {
                  crossTransfer: undefined,
                  mode: 'decrement',
                  type: 'locked',
                  validate: true,
                },
                dbTx: tx,
              });
            }
            if (trx.for === 'platform') {
              await this.internalRevenueService.updateTransaction({
                txDetails: {
                  transactionId: trx.id,
                  statusToUpdate: 'payment_failed',
                },
                balanceUpdate: {
                  crossTransfer: undefined,
                  mode: 'decrement',
                  type: 'available',
                  validate: true,
                },
                dbTx: tx,
              });
            }
          }
        });
      }
    }
  }

  async findAll(userId?: number, id?: number): ApiResponse<OrderInResponse[]> {
    const where: SQL[] = [];
    if (userId) {
      where.push(eq(orders.buyerId, userId));
    }
    if (id) {
      where.push(eq(orders.id, id));
    }
    const _orders = await this.db.query.orders.findMany({
      where: and(...where),
      with: {
        orderItems: {
          with: {
            product: {
              columns: {
                id: true,
                sellerId: true,
                title: true,
                price: true,
                isAuction: true,
                startDate: true,
                endDate: true,
                size: true,
                brand: true,
                color: true,
                condition: true,
                status: true,
              },
              with: {
                images: { columns: { id: true, url: true } },
                seller: {
                  columns: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                    avatarUrl: true,
                    isInfluencer: true,
                  },
                },
                bids: {
                  columns: {
                    amount: true,
                  },
                  limit: 1,
                  orderBy: desc(bids.createdAt),
                },
                reviews: {
                  columns: {
                    status: true,
                  },
                },
              },
            },
          },
        },
        shippingAddress: true,
        buyer: {
          columns: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: desc(orders.createdAt),
    });
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Orders retrieved successfully',
      data: _orders,
    };
  }

  async findOne(userId: number, id: number): ApiResponse<OrderInResponse> {
    const orderRes = await this.findAll(undefined, id);

    if (!orderRes.data.length)
      throw new BadRequestException('Order doesnt exist');

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Order retrieved successfully',
      data: orderRes.data[0],
    };
  }

  async findByCheckoutId(
    userId: number,
    id: string,
  ): ApiResponse<OrderInResponse> {
    const checkoutMetaData =
      await this.stripeService.getCheckoutSessionMetaData(id);

    if (
      checkoutMetaData.type !== 'order' ||
      (checkoutMetaData.type === 'order' && !checkoutMetaData.orderId)
    )
      throw new BadRequestException('Order doesnt exist');
    const res = await this.findOne(userId, +(checkoutMetaData as any).orderId);
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Products retrieved successfully',
      data: res.data,
    };
  }

  async update(
    userId: number,
    id: number,
    updateOrderDto: UpdateOrderDto,
  ): ApiResponse {
    if (!updateOrderDto.status)
      throw new BadRequestException('Nothing to update');

    const [order] = await this.db
      .select({ status: orders.status, deliveredAt: orders.deliveredAt })
      .from(orders)
      .where(and(eq(orders.buyerId, userId), eq(orders.id, id)));

    if (!order) throw new BadRequestException('Order doesnt exist');

    if (order.status === 'completed')
      throw new BadRequestException('Order is already completed');

    if (order.status !== 'shipped')
      throw new BadRequestException(
        'Order is not shipped yet to be marked as completed',
      );

    if (!order.deliveredAt) {
      // @ts-ignore
      updateOrderDto.deliveredAt = sql`CURRENT_TIMESTAMP`;
    }

    await this.db.update(orders).set(updateOrderDto).where(eq(orders.id, id));

    await this.dashboardOrdersService.generateReviewsForOrder(id);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Order updated successfully',
      data: {},
    };
  }
}
