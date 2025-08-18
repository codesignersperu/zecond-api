import {
  bigint,
  pgTable,
  text,
  timestamp,
  decimal,
  boolean,
  varchar,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { type InferSelectModel, relations, sql, type SQL } from 'drizzle-orm';
import {
  users,
  productImages,
  reviews,
  orderItems,
  bids,
  favoriteProducts,
} from '.';
import { timestamps } from './timestamps.helper';
import { tsvector } from './custom-datatypes';

export const productSizeEnum = pgEnum('product_size', [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'One Size',
]);

export const productConditionEnum = pgEnum('product_condition', [
  'new',
  'like_new',
  'excellent',
  'very_good',
  'good',
  'fair',
  'poor',
  'used',
]);

export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'pending_approval',
  'live',
  'auction_ended',
  'sold',
  'archived',
]);

export const products = pgTable(
  'products',
  {
    id: bigint({ mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity({ startWith: 1000 }),
    sellerId: bigint({ mode: 'number' })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    category: varchar({ length: 100 }).notNull(),
    subcategory: varchar({ length: 100 }).notNull(),
    brand: varchar({ length: 100 }).notNull(),
    brandImage: varchar({ length: 255 }).notNull(),
    size: productSizeEnum().notNull(),
    color: varchar({ length: 50 }),
    colorCode: varchar({ length: 10 }),
    material: varchar({ length: 100 }),
    condition: productConditionEnum().notNull(),
    price: decimal({ precision: 10, scale: 2, mode: 'number' }).notNull(),
    isAuction: boolean().default(false).notNull(),
    isFeatured: boolean().default(false).notNull(),
    isPremium: boolean().default(false).notNull(),
    startDate: timestamp(),
    endDate: timestamp(),
    productHeight: decimal({ precision: 5, scale: 2 }),
    chestMeasurement: decimal({ precision: 5, scale: 2 }),
    waistMeasurement: decimal({ precision: 5, scale: 2 }),
    hipsMeasurement: decimal({ precision: 5, scale: 2 }),
    status: productStatusEnum().default('draft').notNull(),
    textSearch: tsvector().generatedAlwaysAs(
      (): SQL => sql`
        setweight(to_tsvector('spanish', ${products.title}), 'A') ||
        setweight(to_tsvector('spanish', ${products.category}), 'B') ||
        setweight(to_tsvector('spanish', ${products.subcategory}), 'B') ||
        setweight(to_tsvector('spanish', ${products.brand}), 'B')
      `,
    ),
    ...timestamps,
  },
  (table) => [
    index('products_category_idx').on(table.category),
    index('products_subcategory_idx').on(table.subcategory),
    index('products_brand_idx').on(table.brand),
    index('products_size_idx').on(table.size),
    index('products_color_idx').on(table.color.nullsLast()),
    index('products_price_idx').on(table.price),
    index('products_isAuction_idx').on(table.isAuction),
    index('products_isFeatured_idx').on(table.isFeatured),
    index('products_isPremium_idx').on(table.isPremium),
    index('products_createdAt_idx').on(table.createdAt),
    index('products_text_search_index').using('gin', table.textSearch),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  seller: one(users, {
    fields: [products.sellerId],
    references: [users.id],
  }),
  images: many(productImages),
  bids: many(bids),
  orderItems: many(orderItems),
  reviews: many(reviews),
  favoriteProducts: many(favoriteProducts),
}));

export type Product = InferSelectModel<typeof products>;

// CREATE OR REPLACE FUNCTION immutable_spanish_tsvector_weighted(text_input text, weight_char char)
// RETURNS tsvector AS $$
//   SELECT setweight(to_tsvector('spanish'::regconfig, text_input), weight_char::"char");
// $$ LANGUAGE sql IMMUTABLE STRICT;
