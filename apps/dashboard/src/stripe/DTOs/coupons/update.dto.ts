import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updateCouponSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export class UpdateCouponDto extends createZodDto(updateCouponSchema) {}
