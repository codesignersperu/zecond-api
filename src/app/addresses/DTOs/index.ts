import { createInsertSchema } from 'drizzle-zod';
import { addresses } from 'src/db/schemas';

export const baseSchema = createInsertSchema(addresses);

export * from './create-address.dto';
export * from './update-address.dto';
export * from './get-addresses-query.dto';
