import type { Admin, AdminAuditLogs } from 'src/db/schemas';

export type AdminResponse = Pick<Admin, 'id' | 'name' | 'email' | 'createdAt'>;

export type AuditLogTimeFrame =
  | 'today'
  | 'yesterday'
  | 'last-week'
  | 'last-month';

export interface AuditLogsResponse
  extends Pick<
    AdminAuditLogs,
    | 'id'
    | 'tableName'
    | 'recordId'
    | 'operation'
    | 'beforeValue'
    | 'afterValue'
    | 'createdAt'
  > {
  admin: Pick<Admin, 'name' | 'email'>;
}
