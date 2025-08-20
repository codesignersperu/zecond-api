import { Role } from '../enums';

export type JwtPayload = {
  id: string;
  email: string;
  sessionId: string;
  role: Role;
};

export type AuthRequestMetadata = {
  isActiveUserOnly: boolean;
  roles: Role[];
};
