import { relations } from 'drizzle-orm';
import {
  pgTable,
  bigint,
  integer,
  varchar,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';
import { recordStatusEnum, transactions, users } from '.';
import { timestamps } from './timestamps.helper';

export const withdrawalAccounts = pgTable(
  'withdrawal_accounts',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    userId: bigint({ mode: 'number' })
      .notNull()
      .references(() => users.id),
    bank: varchar({ length: 255 }).notNull(),
    accountNumber: varchar({ length: 50 }).notNull(),
    cciNumber: varchar({ length: 50 }).notNull(),
    isPrimary: boolean().notNull().default(false),
    status: recordStatusEnum().notNull().default('active'),
    ...timestamps,
  },
  (table) => [
    unique('withdrawal_cci_unique_for_a_user').on(
      table.userId,
      table.cciNumber,
    ),
  ],
);

export const withdrawalAccountsRelations = relations(
  withdrawalAccounts,
  ({ one, many }) => ({
    user: one(users, {
      fields: [withdrawalAccounts.userId],
      references: [users.id],
    }),
    transactions: many(transactions),
  }),
);
