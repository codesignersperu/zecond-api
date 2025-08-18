import { relations } from 'drizzle-orm';
import { bigint, pgTable, varchar, boolean } from 'drizzle-orm/pg-core';
import { users } from '.';
import { timestamps } from './timestamps.helper';

export const userPaymentMethods = pgTable('user_payment_methods', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint({ mode: 'number' })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripePaymentMethodId: varchar({ length: 255 }).unique().notNull(),
  isDefault: boolean().notNull().default(false),
  ...timestamps,
});

export const userPaymentMethodsRelations = relations(
  userPaymentMethods,
  ({ one }) => ({
    user: one(users, {
      fields: [userPaymentMethods.userId],
      references: [users.id],
    }),
  }),
);
