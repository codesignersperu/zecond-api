import { relations } from 'drizzle-orm';
import { bigint, pgTable, text, jsonb } from 'drizzle-orm/pg-core';
import { users } from '.';
import { timestamps } from './timestamps.helper';

export const errorLogs = pgTable('error_logs', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  message: text().notNull(),
  stackTrace: text().default('').notNull(),
  requestUrl: text().default('').notNull(),
  requestData: jsonb().default({}).notNull(),
  additionalData: jsonb().default({}).notNull(),
  ...timestamps,
});
