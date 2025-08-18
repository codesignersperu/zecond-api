import { relations } from 'drizzle-orm';
import {
  integer,
  bigint,
  pgEnum,
  pgTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { orders, products, users } from '.';
import { timestamps } from './timestamps.helper';

export const reviewStatusEnum = pgEnum('review_status', [
  'pending',
  'reviewed',
]);

export const reviews = pgTable(
  'reviews',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    productId: bigint({ mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sellerId: bigint({ mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    userId: bigint({ mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: bigint({ mode: 'number' })
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: reviewStatusEnum().default('pending').notNull(),
    rating: integer(),
    comment: varchar({ length: 1000 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('review_user_product_index').on(table.userId, table.productId),
  ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    relationName: 'reviewsGiven',
    fields: [reviews.userId],
    references: [users.id],
  }),
  seller: one(users, {
    relationName: 'reviews',
    fields: [reviews.sellerId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [reviews.orderId],
    references: [orders.id],
  }),
}));
