import { pgTable, bigint, timestamp } from 'drizzle-orm/pg-core';
import { InferSelectModel, relations } from 'drizzle-orm';
import { users } from './users';
import { products } from './products';
import { timestamps } from './timestamps.helper';

export const cartItems = pgTable('cart_items', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint({ mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  productId: bigint({ mode: 'number' })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  ...timestamps, // Spreading the createdAt and updatedAt columns
  expirey: timestamp(),
});

export const cartsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export type CartItem = InferSelectModel<typeof cartItems>;
