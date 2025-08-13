import { type InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, bigint, decimal, boolean } from 'drizzle-orm/pg-core';
import { products, users } from '.';
import { timestamps } from './timestamps.helper';

export const bids = pgTable('bids', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  productId: bigint({ mode: 'number' })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  bidderId: bigint({ mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  isWinner: boolean().notNull().default(false),
  ...timestamps,
});

export const bidsRelations = relations(bids, ({ one }) => ({
  product: one(products, {
    fields: [bids.productId],
    references: [products.id],
  }),
  bidder: one(users, {
    fields: [bids.bidderId],
    references: [users.id],
  }),
}));

export type Bids = InferSelectModel<typeof bids>;
