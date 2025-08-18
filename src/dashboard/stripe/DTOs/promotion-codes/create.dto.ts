import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const promoAppliesToSchema = z.enum(['products', 'subscriptions', 'all']);

export type PromoAppliesTo = z.infer<typeof promoAppliesToSchema>;

const createPromotionCodeSchema = z.object({
  coupon: z.string().min(1),
  code: z.string().max(50).optional(),
  active: z.boolean().optional(),
  maxRedemptions: z.coerce
    .number()
    .transform((v) => (!v ? undefined : v))
    .optional(),
  expiresAt: z.number().optional(),
  firstTimeTransaction: z.boolean().optional(),
  minimumAmount: z.coerce
    .number()
    .transform((v) => (!v ? undefined : v))
    .optional(),
  appliesTo: promoAppliesToSchema,
});

export class CreatePromotionCodeDto extends createZodDto(
  createPromotionCodeSchema,
) {}
