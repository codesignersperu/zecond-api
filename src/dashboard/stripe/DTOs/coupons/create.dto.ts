import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const discountTypeSchema = z.enum(['percent', 'amount']);

export type DiscountType = z.infer<typeof discountTypeSchema>;

const couponDurationSchema = z.enum(['once', 'repeating', 'forever']);

const createCouponSchema = z
  .object({
    id: z.string().min(1).max(50),
    name: z.string().min(1).max(255).optional(),
    discountType: discountTypeSchema,
    amount: z.number().min(1),
    duration: couponDurationSchema,
    durationInMonths: z.number().min(1).max(12).optional(),
  })
  .superRefine(({ duration, durationInMonths, discountType, amount }, ctx) => {
    if (duration === 'repeating' && !durationInMonths) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "durationInMonths is required when duration is 'repeating'",
        path: ['durationInMonths'],
      });
    }
    if (discountType === 'percent' && amount > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "amount must not be greater than 100 when discountType is 'percent'",
        path: ['amount'],
      });
    }
  });

export class CreateCouponDto extends createZodDto(createCouponSchema) {}
