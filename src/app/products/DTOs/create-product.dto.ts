import { zodToOpenAPI, createZodDto } from 'nestjs-zod';
import { baseSchema } from 'src/app/products/DTOs';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { AnyZodObject, z } from 'zod';
import * as dayjs from 'dayjs';

export const createProductSchema = baseSchema
  .pick({
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
    isAuction: true,
    productHeight: true,
    chestMeasurement: true,
    waistMeasurement: true,
    hipsMeasurement: true,
  })
  .extend({
    mode: z.enum(['draft', 'publish']),
    startDate: z
      .string()
      .transform((v) => new Date(v))
      .optional(),
    endDate: z
      .string()
      .transform((v) => new Date(v))
      .optional(),
  });

export function productSchemaRefinement<T extends AnyZodObject>(schema: T) {
  return schema.superRefine(
    ({ isAuction, startDate, endDate, color, colorCode }, ctx) => {
      if (isAuction && !startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start date is required',
          path: ['startDate'],
        });
      }
      if (isAuction && !endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date is required',
          path: ['endDate'],
        });
      }
      if (isAuction && startDate && endDate) {
        const start = dayjs(startDate);
        const end = dayjs(endDate);
        if (start.isAfter(end)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'End date must be after start date',
            path: ['endDate'],
          });
        }
        if (end.isBefore(Date.now())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Auction End Date must be in the future',
            path: ['endDate'],
          });
        }
      }
      if (color && !colorCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select a color as well',
          path: ['color'],
        });
      }
    },
  ) as unknown as T;
}

export class CreateProductDto extends createZodDto(
  productSchemaRefinement<typeof createProductSchema>(createProductSchema),
) {}

export const CreateProductOpenAPI: SchemaObject =
  zodToOpenAPI(createProductSchema);

// Adding 'images' entry to the request form
// @ts-ignore
CreateProductOpenAPI.properties.images = {
  type: 'array',
  items: {
    type: 'string',
    format: 'binary',
  },
};
CreateProductOpenAPI.required?.push('images');
