import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';
import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm';
import { timestamps } from './timestamps.helper';

export const storeConfig = pgTable('store_config', {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  auctionCommissionPercentage: integer().notNull(),
  deliveryFee: integer().notNull(),
  minimumWithdrawalAmount: integer().notNull(),
  maximumWithdrawalAmount: integer().notNull(),
  banners: varchar({ length: 60 })
    .array()
    .array()
    .notNull()
    .default(sql`ARRAY[]::varchar(60)[][]`),
  mobileBanners: varchar({ length: 60 })
    .array()
    .array()
    .notNull()
    .default(sql`ARRAY[]::varchar(60)[][]`),
  ...timestamps,
});

export type StoreConfig = InferSelectModel<typeof storeConfig>;
export type StoreConfigInsert = InferInsertModel<typeof storeConfig>;
