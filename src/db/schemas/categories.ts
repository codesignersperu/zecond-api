import { pgTable, integer, varchar } from 'drizzle-orm/pg-core';
import { InferInsertModel, relations } from 'drizzle-orm';
import { timestamps } from './timestamps.helper';
import { subcategories } from '.';

export const categories = pgTable('categories', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 100 }).unique().notNull(),
  ...timestamps,
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  subcategories: many(subcategories),
}));

export type CategoriesInsert = InferInsertModel<typeof categories>;
