import { DB_CONNECTION } from 'src/db/db-connection';
import { type SubscriptionPlan, subscriptionPlans } from 'src/db/schemas';
import { Database } from 'src/db/types';
import { ApiStatus } from 'src/lib/enums';
import { ApiResponse } from 'src/lib/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { AppSubscriptionPlan } from '../types';
import { SUBSCRIPTION_PLANS_APP_CACHE_KEY } from '../constants';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * `get` method is to be used in the app to retrieve subscription plans. It caches them to be faster
   */
  async get() {
    const plans = await this.cacheManager.get<AppSubscriptionPlan[]>(
      SUBSCRIPTION_PLANS_APP_CACHE_KEY,
    );

    if (plans) return plans;

    const _plans = await this.db
      .select({
        planId: subscriptionPlans.planId,
        price: subscriptionPlans.price,
        auctionsAllowed: subscriptionPlans.auctionsAllowed,
        featuredProductsAllowed: subscriptionPlans.featuredProductsAllowed,
        premiumProductsAllowed: subscriptionPlans.premiumProductsAllowed,
        auctionCommissionPercentage:
          subscriptionPlans.auctionCommissionPercentage,
        listingsLimit: subscriptionPlans.listingsLimit,
        stripePriceId: subscriptionPlans.stripePriceId,
      })
      .from(subscriptionPlans);

    await this.cacheManager.set(SUBSCRIPTION_PLANS_APP_CACHE_KEY, _plans);
    return _plans;
  }

  /**
   * `findAll` method is for the api endpoint to respond with public subscription plan data
   */
  async findAll(): ApiResponse<
    Pick<
      SubscriptionPlan,
      'id' | 'planId' | 'title' | 'price' | 'subtitle' | 'features'
    >[]
  > {
    const plans = await this.db
      .select({
        id: subscriptionPlans.id,
        planId: subscriptionPlans.planId,
        title: subscriptionPlans.title,
        price: subscriptionPlans.price,
        subtitle: subscriptionPlans.subtitle,
        features: subscriptionPlans.features,
        auctionsAllowed: subscriptionPlans.auctionsAllowed,
      })
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.id);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'plans retrieved successfully',
      data: plans,
    };
  }
}
