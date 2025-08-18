import { pgTable, integer, varchar } from 'drizzle-orm/pg-core';
import { timestamps } from './timestamps.helper';
import { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export const brands = pgTable('brands', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: varchar({ length: 100 }).unique().notNull(),
  imageUrl: varchar({ length: 255 }).unique().notNull(),
  ...timestamps,
});

export type Brand = InferSelectModel<typeof brands>;

export type BrandsInsert = InferInsertModel<typeof brands>;
