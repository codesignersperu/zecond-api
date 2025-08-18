import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const updateOrderSchema = z.object({
  status: z.enum(['completed']).optional(),
});

export class UpdateOrderDto extends createZodDto(updateOrderSchema) {}
