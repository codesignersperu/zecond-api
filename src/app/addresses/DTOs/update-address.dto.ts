import { createAddressSchema } from './create-address.dto';
import { z } from 'zod';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { createZodDto, zodToOpenAPI } from 'nestjs-zod';

const updateAddressSchema = createAddressSchema.partial().extend({
  id: z.number(),
  isPrimary: z.boolean(),
});

export class UpdateAddressDto extends createZodDto(updateAddressSchema) {}

export const UpdateAddressOpenAPI: SchemaObject =
  zodToOpenAPI(updateAddressSchema);
