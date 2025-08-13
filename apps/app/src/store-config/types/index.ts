import { type SubscriptionPlan } from '@libs/db/schemas';

export type AppSubscriptionPlan = Pick<
  SubscriptionPlan,
  | 'planId'
  | 'price'
  | 'auctionsAllowed'
  | 'featuredProductsAllowed'
  | 'premiumProductsAllowed'
  | 'auctionCommissionPercentage'
  | 'listingsLimit'
  | 'stripePriceId'
>;
