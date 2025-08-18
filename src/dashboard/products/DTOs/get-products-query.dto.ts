import { productStatusEnum } from 'src/db/schemas';
import { paginationSchema } from 'src/lib/schemas';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const getProductsQuerySchema = z
  .object({
    sort: z.enum(['asc', 'desc']),
    isAuction: z.coerce.boolean(),
    isFeatured: z.coerce.boolean(),
    isPremium: z.coerce.boolean(),
    status: z.enum(productStatusEnum.enumValues),
    userId: z.coerce.number(),
  })
  .partial()
  .merge(paginationSchema);

export class GetProductsQueryDTO extends createZodDto(getProductsQuerySchema) {}
