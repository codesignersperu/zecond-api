import { relations } from 'drizzle-orm';
import {
  bigint,
  pgTable,
  varchar,
  pgEnum,
  text,
  boolean,
} from 'drizzle-orm/pg-core';
import { users } from '.';
import { timestamps } from './timestamps.helper';

export const notificationTypeEnum = pgEnum('notification_type', [
  'new_bid',
  'bid_outbid',
  'auction_ending_soon',
  'auction_won',
  'auction_lost',
  'item_sold',
  'item_purchased',
  'review_received',
  'new_follower',
  'order_shipped',
  'order_delivered',
  'order_canceled',
  'payment_received',
  'payment_failed',
  'refund_initiated',
  'refund_completed',
  'new_message',
]);

export const notifications = pgTable('notifications', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint({ mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum().notNull(),
  subjectId: bigint({ mode: 'number' }),
  subjectType: varchar({ length: 50 }),
  message: text().notNull(),
  isRead: boolean().notNull().default(false),
  ...timestamps,
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
