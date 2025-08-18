import { transactions } from 'src/db/schemas';
import { createInsertSchema } from 'drizzle-zod';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const withdrawalRequsetSchema = createInsertSchema(transactions)
  .pick({
    amount: true,
  })
  .extend({
    accountId: z.number(),
  });

export class WithdrawalRequsetDTO extends createZodDto(
  withdrawalRequsetSchema,
) {}
