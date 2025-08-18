import { zodToOpenAPI, createZodDto } from 'nestjs-zod';
import { baseSchema } from 'src/app/users/DTOs';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const userSignupSchema = baseSchema.pick({
  email: true,
  firstName: true,
  lastName: true,
  password: true,
});

export class UserSignupDto extends createZodDto(userSignupSchema) {}

export const UserSignupOpenAPI: SchemaObject = zodToOpenAPI(userSignupSchema);
