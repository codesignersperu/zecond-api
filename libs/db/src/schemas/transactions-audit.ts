import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import {
  pgTable,
  bigint,
  pgEnum,
  boolean,
  PgColumn,
} from 'drizzle-orm/pg-core';
import { balancesAudit, transactions } from '.';
import { transactionStatus } from './transactions';
import { timestamps } from './timestamps.helper';

export const balanceUpdateModeEnum = pgEnum(
  'transactions_audit_balance_update_mode',
  ['increment', 'decrement'],
);

export const balanceUpdateTypeEnum = pgEnum(
  'transactions_audit_balance_update_type',
  ['available', 'locked'],
);

export const crossBalanceTransferEnum = pgEnum(
  'transactions_audit_cross_balance_transfer',
  ['available_to_locked', 'locked_to_available'],
);

export const transactionsAudit = pgTable('transactions_audit', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  transactionId: bigint({ mode: 'number' })
    .references(() => transactions.id)
    .notNull(),
  prevStatus: transactionStatus().notNull(),
  updatedStatus: transactionStatus().notNull(),
  balanceUpdated: boolean().notNull(),
  balanceUpdateMode: balanceUpdateModeEnum(),
  balanceUpdateType: balanceUpdateTypeEnum(),
  currentBalanceType: balanceUpdateTypeEnum(),
  crossBalanceTransfer: crossBalanceTransferEnum(),
  balanceAuditId: bigint({ mode: 'number' }).references(
    (): PgColumn => balancesAudit.id,
  ),
  ...timestamps,
});

export const transactionsAuditRelations = relations(
  transactionsAudit,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionsAudit.transactionId],
      references: [transactions.id],
    }),
    balanceAudit: one(balancesAudit, {
      fields: [transactionsAudit.balanceAuditId],
      references: [balancesAudit.id],
    }),
  }),
);

export type TransactionAuditInsert = InferInsertModel<typeof transactionsAudit>;
export type TransactionAudit = InferSelectModel<typeof transactionsAudit>;
