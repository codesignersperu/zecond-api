import { createZodDto } from 'nestjs-zod';
import { baseSchema, productSchemaRefinement } from '.';
import { z } from 'zod';

export const createProductSchema = baseSchema
  .pick({
    sellerId: true,
    title: true,
    description: true,
    category: true,
    subcategory: true,
    brand: true,
    brandImage: true,
    size: true,
    color: true,
    colorCode: true,
    material: true,
    condition: true,
    price: true,
    productHeight: true,
    chestMeasurement: true,
    waistMeasurement: true,
    hipsMeasurement: true,
    status: true,
    isAuction: true,
    isFeatured: true,
    isPremium: true,
  })
  .extend({
    startDate: z
      .string()
      .transform((v) => new Date(v))
      .optional(),
    endDate: z
      .string()
      .transform((v) => new Date(v))
      .optional(),
  });

export class CreateProductDto extends createZodDto(
  productSchemaRefinement<typeof createProductSchema>(createProductSchema),
) {}
