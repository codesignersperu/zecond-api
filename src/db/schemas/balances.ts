import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm';
import { pgTable, bigint, decimal, PgColumn } from 'drizzle-orm/pg-core';
import { balancesAudit, transactions, platformOrUser, users } from '.';
import { timestamps } from './timestamps.helper';

export const balances = pgTable('balances', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  for: platformOrUser().notNull(),
  userId: bigint({ mode: 'number' }).references((): PgColumn => users.id),
  availableBalance: decimal({ precision: 10, scale: 2, mode: 'number' })
    .notNull()
    .default(0),
  lockedBalance: decimal({ precision: 10, scale: 2, mode: 'number' })
    .notNull()
    .default(0),
  ...timestamps,
});

export const balancesRelations = relations(balances, ({ one, many }) => ({
  user: one(users, {
    fields: [balances.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  audit: many(balancesAudit),
}));

export type BalanceInsert = InferInsertModel<typeof balances>;
export type Balance = InferSelectModel<typeof balances>;
