import { relations } from 'drizzle-orm';
import { bigint, pgTable, primaryKey } from 'drizzle-orm/pg-core';
import { users, products } from '.';
import { timestamps } from './timestamps.helper';

export const favoriteProducts = pgTable(
  'favorite_products',
  {
    userId: bigint({ mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: bigint({ mode: 'number' })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => {
    return {
      pk: primaryKey(table.userId, table.productId),
    };
  },
);

export const favoriteProductsRelations = relations(
  favoriteProducts,
  ({ one }) => ({
    user: one(users, {
      fields: [favoriteProducts.userId],
      references: [users.id],
    }),
    product: one(products, {
      fields: [favoriteProducts.productId],
      references: [products.id],
    }),
  }),
);
