import { type User } from 'src/db/schemas';

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
