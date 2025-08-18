import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const promoCodeForSchema = z.enum(['subscriptions', 'products']);

export type PromotionCodeFor = z.infer<typeof promoCodeForSchema>;

const getPromotionCodesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  startingAfter: z.string().optional(),
  endingBefore: z.string().optional(),
  active: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  code: z.string().optional(),
  for: promoCodeForSchema.optional(),
  coupon: z.string().optional(),
  created: z
    .object({
      gt: z.number().optional(),
      gte: z.number().optional(),
      lt: z.number().optional(),
      lte: z.number().optional(),
    })
    .optional(),
});

export class GetPromotionCodesQueryDto extends createZodDto(
  getPromotionCodesQuerySchema,
) {}
