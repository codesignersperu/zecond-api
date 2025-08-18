import { withdrawalAccounts } from 'src/db/schemas';
import { createInsertSchema } from 'drizzle-zod';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const addWithdrawalAccountSchema = createInsertSchema(withdrawalAccounts, {
  accountNumber: z
    .string()
    .min(1, 'Account number is required')
    .regex(/^\d+$/, 'Account number must be a number'),
  cciNumber: z
    .string()
    .min(1, 'CCI number is required')
    .regex(/^\d+$/, 'CCI number must be a number'),
}).pick({
  bank: true,
  accountNumber: true,
  cciNumber: true,
});

export class AddWithdrawalAccountDTO extends createZodDto(
  addWithdrawalAccountSchema,
) {}
