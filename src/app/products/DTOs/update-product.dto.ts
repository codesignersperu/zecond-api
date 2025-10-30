import {
  createProductSchema,
  productSchemaRefinement,
} from './create-product.dto';
import { z } from 'zod';
import { productStatusEnum } from 'src/db/schemas';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { createZodDto, zodToOpenAPI } from 'nestjs-zod';

const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().transform((v) => Number(v)),
  status: z.enum(productStatusEnum.enumValues).optional(),
  sortedImages: z
    .string()
    .transform((v) => JSON.parse(v))
    .optional(),
});

export class UpdateProductDto extends createZodDto(
  productSchemaRefinement<typeof updateProductSchema>(updateProductSchema),
) {}

export const UpdateProductOpenAPI: SchemaObject =
  zodToOpenAPI(updateProductSchema);

// Adding 'images' entry to the request form
// @ts-ignore
UpdateProductOpenAPI.properties.images = {
  type: 'array',
  items: {
    type: 'string',
    format: 'binary',
  },
};
