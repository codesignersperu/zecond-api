import { pgTable, integer, varchar, boolean } from 'drizzle-orm/pg-core';
import { timestamps } from './timestamps.helper';
import { InferInsertModel, type InferSelectModel } from 'drizzle-orm';

export const admins = pgTable('admins', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 50 }),
  email: varchar({ length: 100 }).unique().notNull(),
  passwordHash: varchar({ length: 255 }).notNull(),
  deleted: boolean().notNull().default(false),
  ...timestamps,
});

export type Admin = InferSelectModel<typeof admins>;

export type AdminInsert = InferInsertModel<typeof admins>;
