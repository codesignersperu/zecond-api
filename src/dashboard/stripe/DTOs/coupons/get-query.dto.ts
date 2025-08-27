import { createZodDto } from 'nestjs-zod';
import { coerceNumber } from 'src/lib/schemas';
import { z } from 'zod';

const getCouponsQuerySchema = z.object({
  limit: coerceNumber.pipe(z.number().min(1).max(100)).optional(),
  startingAfter: z.string().optional(),
  endingBefore: z.string().optional(),
  created: z
    .object({
      gt: z.number().optional(),
      gte: z.number().optional(),
      lt: z.number().optional(),
      lte: z.number().optional(),
    })
    .optional(),
});

export class GetCouponsQueryDto extends createZodDto(getCouponsQuerySchema) {}
