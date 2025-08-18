import { InferSelectModel, relations } from 'drizzle-orm';
import {
  pgTable,
  bigint,
  decimal,
  varchar,
  pgEnum,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users, addresses, orderItems, transactions } from '.';
import { timestamps } from './timestamps.helper';

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'processing_payment',
  'placed',
  'processing',
  'shipped',
  'delivered',
  'canceled',
  'on_hold',
  'completed',
]);

export const orderPaymentStatus = pgEnum('order_payment_status', [
  'processing',
  'paid',
  'failed',
  'refunded',
  'unpaid',
]);

export const orderDiscountTypeEnum = pgEnum('order_discount_type', [
  'percent',
  'amount',
]);

export const orders = pgTable('orders', {
  id: bigint({ mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity({ startWith: 1000 }),
  buyerId: bigint({ mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subTotal: decimal({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  total: decimal({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  shippingAddressId: bigint({ mode: 'number' })
    .notNull()
    .references(() => addresses.id),
  status: orderStatusEnum().default('processing_payment').notNull(),
  paymentStatus: orderPaymentStatus().default('processing').notNull(),
  stripePaymentId: varchar({
    length: 255,
  }).unique(),
  // Shipment Info
  shippingCarrier: varchar({ length: 100 }),
  shippingCost: decimal({ precision: 10, scale: 2, mode: 'number' }),
  shipmentTrackingUrl: varchar({ length: 255 }),
  deliveredAt: timestamp(),
  // Discount
  discountType: orderDiscountTypeEnum(),
  discountAmount: decimal({ precision: 10, scale: 2, mode: 'number' }),
  discountCode: varchar({ length: 100 }),
  ...timestamps,
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
  shippingAddress: one(addresses, {
    fields: [orders.shippingAddressId],
    references: [addresses.id],
  }),
  orderItems: many(orderItems),
  transactions: many(transactions),
}));

export type Order = InferSelectModel<typeof orders>;
