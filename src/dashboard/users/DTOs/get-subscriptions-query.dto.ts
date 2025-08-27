import { coerceNumber, paginationSchema } from 'src/lib/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const getSubscriptionsQuerySchema = z
  .object({
    plan: z.enum(['zecond-black', 'todo-zecond']),
    userId: coerceNumber,
  })
  .partial()
  .merge(paginationSchema);

export class GetSubscriptionsQueryDTO extends createZodDto(
  getSubscriptionsQuerySchema,
) {}
