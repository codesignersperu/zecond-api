import { createInsertSchema } from 'drizzle-zod';
import { products } from 'src/db/schemas';
import { z } from 'zod';

export const baseSchema = createInsertSchema(products, {
  price: z.string().transform((v) => parseFloat(v)),
  isAuction: z.enum(['true', 'false']).transform((v) => v === 'true'),
});

export * from './update-product.dto';
export * from './product-card-select.dto';
export * from './bid.dto';
export * from './get-products-query.dto';
