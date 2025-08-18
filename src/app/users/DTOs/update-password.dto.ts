import { createZodDto, zodToOpenAPI } from 'nestjs-zod';
import { baseSchema } from '.';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const updatePasswordSchema = baseSchema
  .pick({
    password: true,
  })
  .extend({ newPassword: baseSchema.shape.password });

export class UpdatePasswordDto extends createZodDto(updatePasswordSchema) {}

export const UpdatePasswordOpenAPI: SchemaObject =
  zodToOpenAPI(updatePasswordSchema);
