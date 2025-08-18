import { createInsertSchema } from 'drizzle-zod';
import { products } from 'src/db/schemas';
import { type AnyZodObject, z } from 'zod';
import * as dayjs from 'dayjs';

export const baseSchema = createInsertSchema(products, {
  sellerId: z.string().transform((v) => parseInt(v)),
  price: z.string().transform((v) => parseFloat(v)),
  isAuction: z.enum(['true', 'false']).transform((v) => v === 'true'),
  isFeatured: z.enum(['true', 'false']).transform((v) => v === 'true'),
  isPremium: z.enum(['true', 'false']).transform((v) => v === 'true'),
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

export * from './create-product.dto';
export * from './update-product.dto';
export * from './get-products-query.dto';
