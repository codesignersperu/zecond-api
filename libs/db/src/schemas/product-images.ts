import { bigint, integer, varchar, pgTable } from 'drizzle-orm/pg-core';
import { type InferSelectModel, relations } from 'drizzle-orm';
import { products } from '.';
import { timestamps } from './timestamps.helper';

export const productImages = pgTable('product_images', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  productId: bigint({ mode: 'number' })
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  url: varchar({ length: 255 }).notNull(),
  ...timestamps,
});

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export type ProductImage = InferSelectModel<typeof productImages>;
