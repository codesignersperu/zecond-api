import { InferSelectModel, relations } from 'drizzle-orm';
import { bigint, pgTable, varchar, unique, pgEnum } from 'drizzle-orm/pg-core';
import { users } from '.';
import { timestamps } from './timestamps.helper';

export const accountProviderEnum = pgEnum('account_provider', [
  'google',
  'facebook',
  'apple',
]);

export const connectedAccounts = pgTable(
  'connected_accounts',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    userId: bigint({ mode: 'number' })
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),
    provider: accountProviderEnum().notNull(),
    providerUserId: varchar({ length: 255 }).notNull(),
    ...timestamps,
  },
  (table) => {
    return {
      uniqueProviderUser: unique().on(table.provider, table.providerUserId),
    };
  },
);

export const connectedAccountsRelations = relations(
  connectedAccounts,
  ({ one }) => ({
    user: one(users, {
      fields: [connectedAccounts.userId],
      references: [users.id],
    }),
  }),
);

export type ConnectedAccount = InferSelectModel<typeof connectedAccounts>;
