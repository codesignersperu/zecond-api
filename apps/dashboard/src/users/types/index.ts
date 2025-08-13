import { type User } from '@libs/db/schemas';

export type UserInResponse = Pick<
  User,
  | 'id'
  | 'firstName'
  | 'lastName'
  | 'username'
  | 'email'
  | 'avatarUrl'
  | 'isInfluencer'
>;
