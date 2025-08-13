import { createProductSchema } from './create-product.dto';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { productSchemaRefinement } from '.';

const updateProductSchema = createProductSchema.partial().extend({
  sortedImages: z
    .string()
    .transform((v) => JSON.parse(v))
    .optional(),
});

export class UpdateProductDto extends createZodDto(
  productSchemaRefinement<typeof updateProductSchema>(updateProductSchema),
) {}
