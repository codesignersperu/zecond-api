import { relations } from 'drizzle-orm';
import { bigint, pgTable, primaryKey } from 'drizzle-orm/pg-core';
import { users } from '.';
import { timestamps } from './timestamps.helper';

export const followers = pgTable(
  'followers',
  {
    followerId: bigint({ mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followingId: bigint({ mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => {
    return {
      pk: primaryKey(table.followerId, table.followingId),
    };
  },
);

export const followersRelations = relations(followers, ({ one }) => ({
  follower: one(users, {
    fields: [followers.followerId],
    references: [users.id],
    relationName: 'followers',
  }),
  following: one(users, {
    fields: [followers.followingId],
    references: [users.id],
    relationName: 'following',
  }),
}));
