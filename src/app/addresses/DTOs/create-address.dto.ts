import { zodToOpenAPI, createZodDto } from 'nestjs-zod';
import { baseSchema } from 'src/app/addresses/DTOs';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

export const createAddressSchema = baseSchema.pick({
  recipientName: true,
  phoneNumber: true,
  state: true,
  municipality: true,
  city: true,
  neighborhood: true,
  street: true,
  exteriorReference: true,
  interiorReference: true,
  postalCode: true,
});

export class CreateAddressDto extends createZodDto(createAddressSchema) {}

export const CreateAddressOpenAPI: SchemaObject =
  zodToOpenAPI(createAddressSchema);
