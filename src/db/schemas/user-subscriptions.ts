import { InferSelectModel, relations } from 'drizzle-orm';
import {
  pgTable,
  integer,
  bigint,
  varchar,
  pgEnum,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users, subscriptionPlans, transactions } from '.';
import { timestamps } from './timestamps.helper';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'expired',
  'processing_payment',
  'active',
  'paused',
  'payment_failed',
  'cancelled',
]);

export const subscriptionPaymentStatus = pgEnum('subscription_payment_status', [
  'processing',
  'paid',
  'failed',
  'refunded',
  'unpaid',
]);

export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    userId: bigint({ mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: varchar()
      .notNull()
      .references(() => subscriptionPlans.planId),
    status: subscriptionStatusEnum().default('processing_payment').notNull(),
    paymentStatus: subscriptionPaymentStatus().default('processing').notNull(),
    listingsRemaining: integer().notNull(),
    renewedAt: timestamp().notNull(),
    nextRenewal: timestamp().notNull(),
    stripeSubscriptionId: varchar({
      length: 255,
    })
      .unique()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index('stripe_subscription_id_index').on(table.stripeSubscriptionId),
  ],
);

export const userSubscriptionsRelations = relations(
  userSubscriptions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [userSubscriptions.userId],
      references: [users.id],
    }),
    plan: one(subscriptionPlans, {
      fields: [userSubscriptions.planId],
      references: [subscriptionPlans.planId],
    }),
    transactions: many(transactions),
  }),
);

export type UserSubscription = InferSelectModel<typeof userSubscriptions>;
