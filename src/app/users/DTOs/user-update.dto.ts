import { createZodDto, zodToOpenAPI } from 'nestjs-zod';
import { baseSchema } from '.';
import { z } from 'zod';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const userUpdateSchema = baseSchema
  .pick({
    username: true,
    email: true,
    firstName: true,
    lastName: true,
    phoneNumber: true,
  })
  .extend({ deleteAvatar: z.string() }) // deleteAvatar is basically just a flag to delete user's current avatar & reset back to ui-avatars.com
  .partial();

export class UserUpdateDto extends createZodDto(userUpdateSchema) {}

export const UserUpdateOpenAPI: SchemaObject = zodToOpenAPI(userUpdateSchema);

// Adding 'avatarUrl' entry to the request form
// @ts-ignore
UserUpdateOpenAPI.properties.avatarUrl = {
  type: 'string',
  format: 'binary',
};
