import { createZodDto, zodToOpenAPI } from 'nestjs-zod';
import { baseSchema } from '.';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const userLoginSchema = baseSchema.pick({
  email: true,
  password: true,
});

export class UserLoginDto extends createZodDto(userLoginSchema) {}

export const UserLoginOpenAPI: SchemaObject = zodToOpenAPI(userLoginSchema);
