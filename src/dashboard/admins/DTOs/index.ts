import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { admins, type Admin } from 'src/db/schemas';

export const baseSchema = createInsertSchema(admins, {
  email: z.string().email(),
}).extend({
  password: z.string().min(6).max(32),
});

export * from './create-admin.dto';
export * from './admin-login.dto';
