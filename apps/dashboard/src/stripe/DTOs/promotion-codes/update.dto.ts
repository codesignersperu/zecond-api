import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const updatePromotionCodeSchema = z.object({
  active: z.boolean().optional(),
});

export class UpdatePromotionCodeDto extends createZodDto(
  updatePromotionCodeSchema,
) {}
