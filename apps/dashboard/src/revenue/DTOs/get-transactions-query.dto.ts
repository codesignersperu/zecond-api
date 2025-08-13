import { z } from 'zod';
import { paginationSchema } from '@libs/global/schemas';
import { createZodDto } from 'nestjs-zod';
import { transactionStatus, transactionType } from '@libs/db/schemas';

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
