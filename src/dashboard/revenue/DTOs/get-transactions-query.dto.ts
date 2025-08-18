import { z } from 'zod';
import { paginationSchema } from 'src/lib/schemas';
import { createZodDto } from 'nestjs-zod';
import { transactionStatus, transactionType } from 'src/db/schemas';

const getTransactionsQuerySchema = z
  .object({
    type: z.enum(transactionType.enumValues),
    status: z.enum(transactionStatus.enumValues),
    userId: z.coerce.number(),
    sort: z.enum(['asc', 'desc']).default('desc'),
  })
  .partial()
  .merge(paginationSchema);

export class GetTransactionsQueryDTO extends createZodDto(
  getTransactionsQuerySchema,
) {}
