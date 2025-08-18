import { relations } from 'drizzle-orm';
import { pgTable, bigint, decimal, PgColumn } from 'drizzle-orm/pg-core';
import { balances, transactionsAudit } from '.';
import { timestamps } from './timestamps.helper';

export const balancesAudit = pgTable('balances_audit', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  balanceId: bigint({ mode: 'number' })
    .notNull()
    .references(() => balances.id),
  txAuditId: bigint({ mode: 'number' })
    .notNull()
    .references((): PgColumn => transactionsAudit.id),
  prevAvailableBalance: decimal({
    precision: 10,
    scale: 2,
    mode: 'number',
  }).notNull(),
  updatedAvailableBalance: decimal({
    precision: 10,
    scale: 2,
    mode: 'number',
  }).notNull(),
  prevLockedBalance: decimal({
    precision: 10,
    scale: 2,
    mode: 'number',
  }).notNull(),
  updatedLockedBalance: decimal({
    precision: 10,
    scale: 2,
    mode: 'number',
  }).notNull(),
  ...timestamps,
});

export const balancesAuditRelations = relations(balancesAudit, ({ one }) => ({
  balance: one(balances, {
    fields: [balancesAudit.balanceId],
    references: [balances.id],
  }),
  txAudit: one(transactionsAudit, {
    fields: [balancesAudit.txAuditId],
    references: [transactionsAudit.id],
  }),
}));
