import { productSizeEnum } from 'src/db/schemas';
import { coerceBoolean, paginationSchema } from 'src/lib/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const getProductsQuerySchema = z
  .object({
    sort: z.enum(['asc', 'desc', 'price-asc', 'price-desc']),
    query: z.string(),
    ids: z
      .string()
      .regex(/^\d+(,\d+)*$/, 'ids must be a comma-separated list of numbers')
      .transform((v) => v.split(',').map((v) => parseInt(v))),
    userIdForBid: z
      .string()
      .regex(/^\d+$/, 'userIdForBid must be a number')
      .transform((v) => parseInt(v)),
    userId: z.coerce.number(),
    excludeProduct: z.coerce.number(),
    version: z.enum(['full']),
    category: z.string(),
    subcategory: z.string(),
    size: z.enum(productSizeEnum.enumValues),
    color: z.string(),
    brand: z.string(),
    isAuction: coerceBoolean,
    isFeatured: coerceBoolean,
    isPremium: coerceBoolean,
    mode: z.enum(['checkout', 'fetch']),
  })
  .partial()
  .merge(paginationSchema);

export class GetProductsQueryDTO extends createZodDto(getProductsQuerySchema) {}
