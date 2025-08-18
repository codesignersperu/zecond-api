import { integer, varchar, pgTable } from 'drizzle-orm/pg-core';
import { InferInsertModel, relations } from 'drizzle-orm';
import { categories } from '.';
import { timestamps } from './timestamps.helper';

export const subcategories = pgTable('subcategories', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  categoryId: integer()
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
  name: varchar({ length: 100 }).notNull(),
  iconKey: varchar({ length: 100 }).notNull(),
  ...timestamps,
});

export const subcategoriesRelations = relations(subcategories, ({ one }) => ({
  category: one(categories, {
    fields: [subcategories.categoryId],
    references: [categories.id],
  }),
}));

export type SubcategoriesInsert = InferInsertModel<typeof subcategories>;
