import { productStatusEnum } from 'src/db/schemas';
import { coerceBoolean, coerceNumber, paginationSchema } from 'src/lib/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const getProductsQuerySchema = z
  .object({
    sort: z.enum(['asc', 'desc']),
    isAuction: coerceBoolean,
    isFeatured: coerceBoolean,
    isPremium: coerceBoolean,
    status: z.enum(productStatusEnum.enumValues),
    userId: coerceNumber,
  })
  .partial()
  .merge(paginationSchema);

export class GetProductsQueryDTO extends createZodDto(getProductsQuerySchema) {}
