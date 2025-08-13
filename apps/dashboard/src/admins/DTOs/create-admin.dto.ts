import { zodToOpenAPI, createZodDto } from 'nestjs-zod';
import { baseSchema } from '.';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const createAdminSchema = baseSchema.pick({
  email: true,
  name: true,
  password: true,
});

export class CreateAdminDto extends createZodDto(createAdminSchema) {}

export const CreateAdminOpenAPI: SchemaObject = zodToOpenAPI(createAdminSchema);
