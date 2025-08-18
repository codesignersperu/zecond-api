import { z } from 'zod';
import { productStatusEnum } from 'src/db/schemas';
import { baseSchema } from '.';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { createZodDto, zodToOpenAPI } from 'nestjs-zod';

const updateProductSchema = baseSchema
  .pick({
    title: true,
    description: true,
  })
  .partial()
  .extend({
    id: z.string().transform((v) => Number(v)),
    status: z.enum(productStatusEnum.enumValues).optional(),
  });

export class UpdateProductDto extends createZodDto(updateProductSchema) {}

export const UpdateProductOpenAPI: SchemaObject =
  zodToOpenAPI(updateProductSchema);
