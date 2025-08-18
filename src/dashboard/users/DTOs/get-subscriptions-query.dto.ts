import { paginationSchema } from 'src/lib/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const getSubscriptionsQuerySchema = z
  .object({
    plan: z.enum(['zecond-black', 'todo-zecond']),
    userId: z.coerce.number(),
  })
  .partial()
  .merge(paginationSchema);

export class GetSubscriptionsQueryDTO extends createZodDto(
  getSubscriptionsQuerySchema,
) {}
