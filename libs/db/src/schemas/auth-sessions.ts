import { pgTable, uuid, bigint, timestamp } from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel } from 'drizzle-orm';
import { users } from '.';
import { timestamps } from './timestamps.helper';

export const authSessions = pgTable('auth_sessions', {
  id: uuid().primaryKey(),
  userId: bigint({ mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp().notNull(),
  ...timestamps,
});

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, {
    fields: [authSessions.userId],
    references: [users.id],
  }),
}));

export type AuthSession = InferSelectModel<typeof authSessions>;
