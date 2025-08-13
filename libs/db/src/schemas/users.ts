import {
  pgTable,
  varchar,
  boolean,
  pgEnum,
  index,
  bigint,
  PgColumn,
} from 'drizzle-orm/pg-core';
import { relations, type SQL, type InferSelectModel, sql } from 'drizzle-orm';
import {
  addresses,
  products,
  bids,
  orders,
  reviews,
  favoriteProducts,
  followers,
  userPaymentMethods,
  connectedAccounts,
  notifications,
  authSessions,
  cartItems,
  userSubscriptions,
  transactions,
  balances,
  withdrawalAccounts,
} from '.';
import { timestamps } from './timestamps.helper';
import { tsvector } from './custom-datatypes';

export const usersStatusEnum = pgEnum('user_status', [
  'active',
  'pending_approval',
  'disabled',
  'deleted',
]);

export const users = pgTable(
  'users',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    email: varchar({ length: 320 }).notNull().unique(),
    username: varchar({ length: 50 }).notNull().unique(),
    passwordHash: varchar({ length: 255 }).notNull(),
    firstName: varchar({ length: 50 }).notNull(),
    lastName: varchar({ length: 50 }).notNull(),
    phoneNumber: varchar({ length: 20 }),
    avatarUrl: varchar({ length: 255 }).notNull(),
    isInfluencer: boolean().default(false).notNull(),
    stripeCustomerId: varchar({ length: 255 }).unique(),
    status: usersStatusEnum().default('active').notNull(),
    textSearch: tsvector().generatedAlwaysAs(
      (): SQL => sql`
    setweight(to_tsvector('spanish', ${users.email}), 'A') ||
    setweight(to_tsvector('spanish', ${users.username}), 'B') ||
    setweight(to_tsvector('spanish', ${users.firstName}), 'B') ||
    setweight(to_tsvector('spanish', ${users.lastName}), 'B')
`,
    ),
    balanceId: bigint({ mode: 'number' }).references(
      (): PgColumn => balances.id,
    ),
    ...timestamps,
  },
  (table) => [index('text_search_index').using('gin', table.textSearch)],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  balance: one(balances, {
    fields: [users.balanceId],
    references: [balances.id],
  }),
  addresses: many(addresses),
  products: many(products),
  bids: many(bids),
  orders: many(orders),
  reviews: many(reviews, { relationName: 'reviews' }),
  reviewsGiven: many(reviews, { relationName: 'reviewsGiven' }),
  favoriteProducts: many(favoriteProducts),
  following: many(followers, { relationName: 'following' }),
  followers: many(followers, { relationName: 'followers' }),
  paymentMethods: many(userPaymentMethods),
  connectedAccounts: many(connectedAccounts),
  notifications: many(notifications),
  authSessions: many(authSessions),
  cartItems: many(cartItems),
  subscriptions: many(userSubscriptions),
  transactions: many(transactions),
  withdrawalAccounts: many(withdrawalAccounts),
}));

export type User = InferSelectModel<typeof users>;
