import { createZodDto, zodToOpenAPI } from 'nestjs-zod';
import { baseSchema } from '.';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const adminLoginSchema = baseSchema.pick({
  email: true,
  password: true,
});

export class AdminLoginDto extends createZodDto(adminLoginSchema) {}

export const AdminLoginOpenAPI: SchemaObject = zodToOpenAPI(adminLoginSchema);
