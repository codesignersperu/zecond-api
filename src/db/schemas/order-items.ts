import { InferSelectModel, relations } from 'drizzle-orm';
import { bigint, integer, pgTable, decimal } from 'drizzle-orm/pg-core';
import { orders, products } from '.';
import { timestamps } from './timestamps.helper';

export const orderItems = pgTable('order_items', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  orderId: bigint({ mode: 'number' })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: bigint({ mode: 'number' })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer().notNull(),
  price: decimal({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  ...timestamps,
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export type OrderItem = InferSelectModel<typeof orderItems>;
