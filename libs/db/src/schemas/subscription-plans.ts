import {
  pgTable,
  text,
  varchar,
  decimal,
  jsonb,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { timestamps } from './timestamps.helper';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type SubscriptionPlansIds =
  | 'zecond-free'
  | 'zecond-black'
  | 'todo-zecond';

export const subscriptionPlans = pgTable('subscription_plans', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  planId: varchar({ length: 100 }).unique().notNull(),
  title: varchar({ length: 100 }).notNull(),
  subtitle: text(),
  price: decimal({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  features: jsonb(),
  listingsLimit: integer().notNull(),
  auctionsAllowed: boolean().notNull(),
  featuredProductsAllowed: boolean().notNull(),
  premiumProductsAllowed: boolean().notNull(),
  auctionCommissionPercentage: decimal({
    precision: 10,
    scale: 2,
    mode: 'number',
  }).notNull(),
  stripePriceId: varchar({ length: 255 }).unique().notNull(),
  ...timestamps,
});

export type SubscriptionPlan = InferSelectModel<typeof subscriptionPlans>;

export type SubscriptionPlanInsert = InferInsertModel<typeof subscriptionPlans>;
