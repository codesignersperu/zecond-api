import {
  pgTable,
  text,
  jsonb,
  integer,
  bigint,
  varchar,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { admins } from './admins';
import { timestamps } from './timestamps.helper';
import { InferSelectModel, relations } from 'drizzle-orm';

export const adminAuditLogsOperationsEnum = pgEnum(
  'admin_audit_logs_operations',
  ['CREATE', 'UPDATE', 'DELETE'],
);

export type AdminAuditLogsOperations =
  (typeof adminAuditLogsOperationsEnum.enumValues)[number];

export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  adminId: integer()
    .notNull()
    .references(() => admins.id),
  operation: adminAuditLogsOperationsEnum().notNull(),
  tableName: text().notNull(),
  recordId: varchar({ length: 255 }).notNull(),
  beforeValue: jsonb().notNull(),
  afterValue: jsonb().notNull(),
  ...timestamps,
});

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(admins, {
    fields: [adminAuditLogs.adminId],
    references: [admins.id],
  }),
}));

export type AdminAuditLogs = InferSelectModel<typeof adminAuditLogs>;
