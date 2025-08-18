import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, bigint, pgEnum, decimal, boolean } from 'drizzle-orm/pg-core';
import {
  balances,
  orders,
  users,
  userSubscriptions,
  platformOrUser,
  withdrawalAccounts,
  products,
  transactionsAudit,
} from '.';
import { timestamps } from './timestamps.helper';

export const transactionType = pgEnum('transaction_type', [
  'order',
  'subscription',
  'correction',
  'withdrawal',
]);

export const transactionStatus = pgEnum('transaction_status', [
  'pending',
  'processing',
  'pending_clearance',
  'succeeded',
  'failed',
  'payment_failed',
  'cancelled',
  'refunded',
  'rejected',
]);

export const transactions = pgTable('transactions', {
  id: bigint({ mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity({ startWith: 1000 }),
  for: platformOrUser().notNull(),
  type: transactionType().notNull(),
  userId: bigint({ mode: 'number' }).references(() => users.id),
  balanceId: bigint({ mode: 'number' }).references(() => balances.id),
  orderId: bigint({ mode: 'number' }).references(() => orders.id),
  productId: bigint({ mode: 'number' }).references(() => products.id),
  subscriptionId: bigint({ mode: 'number' }).references(
    () => userSubscriptions.id,
  ),
  accountId: bigint({ mode: 'number' }).references(() => withdrawalAccounts.id),
  amount: decimal({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  status: transactionStatus().notNull(),
  ...timestamps,
});

export const transactionsRelations = relations(
  transactions,
  ({ many, one }) => ({
    user: one(users, {
      fields: [transactions.userId],
      references: [users.id],
    }),
    balance: one(balances, {
      fields: [transactions.balanceId],
      references: [balances.id],
    }),
    order: one(orders, {
      fields: [transactions.orderId],
      references: [orders.id],
    }),
    product: one(products, {
      fields: [transactions.productId],
      references: [products.id],
    }),
    subscription: one(userSubscriptions, {
      fields: [transactions.subscriptionId],
      references: [userSubscriptions.id],
    }),
    account: one(withdrawalAccounts, {
      fields: [transactions.accountId],
      references: [withdrawalAccounts.id],
    }),
    audit: many(transactionsAudit),
  }),
);

export type TransactionInsert = InferInsertModel<typeof transactions>;
export type Transaction = InferSelectModel<typeof transactions>;
