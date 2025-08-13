import {
  integer,
  pgTable,
  varchar,
  boolean,
  bigint,
} from 'drizzle-orm/pg-core';
import { type InferSelectModel, relations } from 'drizzle-orm';
import { recordStatusEnum, users } from '.';
import { timestamps } from './timestamps.helper';

export const addresses = pgTable('addresses', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint({ mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade', onUpdate: 'restrict' }),
  recipientName: varchar({ length: 255 }).notNull(),
  phoneNumber: varchar({ length: 20 }).notNull(),
  country: varchar({ length: 50 }).notNull().default('México'),
  state: varchar({ length: 50 }).notNull(),
  city: varchar({ length: 50 }).notNull(),
  municipality: varchar({ length: 50 }).notNull(),
  neighborhood: varchar({ length: 50 }).notNull(),
  street: varchar({ length: 50 }).notNull(),
  exteriorReference: varchar({ length: 50 }).notNull(),
  interiorReference: varchar({ length: 50 }),
  postalCode: integer().notNull(),
  isPrimary: boolean().notNull().default(false),
  status: recordStatusEnum().notNull().default('active'),
  ...timestamps,
});

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.id], references: [users.id] }),
}));

export type Address = InferSelectModel<typeof addresses>;
