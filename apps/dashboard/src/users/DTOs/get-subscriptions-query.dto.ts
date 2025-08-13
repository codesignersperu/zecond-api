import { paginationSchema } from '@libs/global/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const getSubscriptionsQuerySchema = z
  .object({
    plan: z.enum(['tuyo-black', 'todo-tuyo']),
    userId: z.coerce.number(),
  })
  .partial()
  .merge(paginationSchema);

export class GetSubscriptionsQueryDTO extends createZodDto(
  getSubscriptionsQuerySchema,
) {}
