import type {
  NodePgDatabase,
  NodePgTransaction,
} from 'drizzle-orm/node-postgres';
import * as schema from 'src/db/schemas';
import type { ExtractTablesWithRelations } from 'drizzle-orm';

// For quering data
export type IDBSchema = typeof schema;
export type Database = NodePgDatabase<IDBSchema>;

export type DbTransaction = NodePgTransaction<
  IDBSchema,
  ExtractTablesWithRelations<IDBSchema>
>;
