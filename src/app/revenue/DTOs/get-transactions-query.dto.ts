import { transactionStatus, transactionType } from 'src/db/schemas';
import { paginationSchema } from 'src/lib/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const getTransactionsQuerySchema = z
  .object({
    type: z.enum(transactionType.enumValues),
    status: z.enum(transactionStatus.enumValues),
    sort: z.enum(['asc', 'desc']).default('desc'),
  })
  .partial()
  .merge(paginationSchema);

export class GetTransactionsQueryDTO extends createZodDto(
  getTransactionsQuerySchema,
) {}
