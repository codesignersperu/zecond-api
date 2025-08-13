import { pgTable, integer, varchar } from 'drizzle-orm/pg-core';
import { InferInsertModel } from 'drizzle-orm';
import { timestamps } from './timestamps.helper';

export const colors = pgTable('colors', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 100 }).unique().notNull(),
  code: varchar({ length: 10 }).unique().notNull(),
  ...timestamps,
});

export type ColorInsert = InferInsertModel<typeof colors>;
