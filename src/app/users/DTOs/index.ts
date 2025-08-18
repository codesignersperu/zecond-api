// INFO: exports from other files at the end to avoid circular dependencies issue
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { users, type User } from 'src/db/schemas';

export const baseSchema = createInsertSchema(users, {
  email: z.string().email(),
}).extend({
  // TODO: Validate for strong password
  password: z.string().min(8).max(32),
});

export class UserResponseDto {
  id: User['id'];
  username: User['username'];
  email: User['email'];
  firstName: User['firstName'];
  lastName: User['lastName'];
  phoneNumber: User['phoneNumber'];
  avatarUrl: User['avatarUrl'];
  isInfluencer: User['isInfluencer'];
  status: User['status'];
  noOfReviews: number;
  rating: number;

  constructor(user: User, noOfReviews: number, rating: string | null) {
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.phoneNumber = user.phoneNumber;
    this.avatarUrl = user.avatarUrl;
    this.isInfluencer = user.isInfluencer;
    this.status = user.status;
    this.noOfReviews = noOfReviews;
    this.rating = rating ? Number(rating) : 0;
  }
}

export * from './user-signup.dto';
export * from './user-login.dto';
export * from './user-update.dto';
export * from './update-password.dto';
