import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import type { Database } from 'src/db/types';
import { authSessions, users } from 'src/db/schemas';
import { and, eq, lt } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { v4 as uuidv4 } from 'uuid';
import { ADMIN_SESSION } from './constants';
import { AuthRequestMetadata, JwtPayload } from './types';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Role } from './enums';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * The function "hashPassword" asynchronously hashes a given password using @node-rs/argon2 with argon2id algorithm.
   * @param {string} password - The `password` parameter is a password that represents the string that you want to
   * hash.
   * @returns a promise that resolves to the hashed version of the input data.
   */
  async hashPassword(password: string): Promise<string> {
    return hash(password, { memoryCost: 6144, timeCost: 5, parallelism: 3 });
  }

  /**
   * The function "comparePassword" asynchronously compares a given password with its hash using bcrypt.
   * @param {string} password - The `password` parameter is a password provided by the user.
   * @param {string} hash - The `hash` parameter is a string that represents the hashed version of the password.
   * @returns a promise that resolves to a boolean value indicating whether the provided password matches the
   * hashed password.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      const res = await verify(hash, password);
      return res;
    } catch {
      return false;
    }
  }

  /**
   * The function `generateToken` asynchronously generates an access token using the provided user ID
   * and email. And stores the reference to that token in the database.
   * @param {object} payload - { id: number; email: string }.
   * @returns returns a promise that resolves to a string representing the generated access token.
   */
  async generateToken(
    payload: { id: number; email: string },
    config: { role: Role },
  ): Promise<string> {
    const forAdmin = config.role === Role.ADMIN;
    const sessionId = forAdmin ? ADMIN_SESSION : uuidv4();

    const token = await this.jwtService.signAsync(
      { ...payload, sessionId, role: config.role },
      {
        secret: this.configService.getOrThrow('JWT_SECRET'),
        expiresIn: this.configService.getOrThrow('JWT_EXPIRY') + 'd',
      },
    );

    // early return token for admin, don't need to save any session
    if (forAdmin) return token;

    // Saving auth session
    let expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + +this.configService.get('JWT_EXPIRY'),
    );

    await this.db
      .insert(authSessions)
      .values({ id: sessionId, userId: payload.id, expiresAt });

    return token;
  }

  /**
   * The function `validateToken` performs additional validation after the jwt token is validated.
   * @param {JwtPayload} payload
   * @returns returns a promise that resolves to a string representing the generated access token.
   */
  async validateToken(
    payload: JwtPayload,
    metadata: AuthRequestMetadata,
  ): Promise<JwtPayload> {
    // checking if payload role satisfies specified role
    if (!metadata.roles.includes(payload.role))
      throw new UnauthorizedException(
        "Unauthorized. your role doesn't allow you this operation",
      );

    // checking if it's admins session
    if (payload.sessionId === ADMIN_SESSION) return payload;

    // -- validating the token with database --
    // 1: checking the cache
    let session = await this.cacheManager.get(
      `user-auth-session:${payload.id}:${payload.sessionId}`,
    );

    // 2: querying the db
    if (!session) {
      [session] = await this.db
        .select({ sessionId: authSessions.id })
        .from(authSessions)
        .where(eq(authSessions.id, payload.sessionId));

      // 3: setting the cache
      if (session)
        await this.cacheManager.set(
          `user-auth-session:${payload.id}:${payload.sessionId}`,
          1,
        );
    }

    if (!session)
      throw new UnauthorizedException('Invalid token. Please Login Again');

    if (metadata.isActiveUserOnly) {
      const user = await this.db.query.users.findFirst({
        where: and(eq(users.status, 'active'), eq(users.id, +payload.id)),
      });

      if (!user)
        throw new UnauthorizedException(
          "You can'nt proceed with this action. Please contact support",
        );
    }
    return payload;
  }

  /**
   * The function `invalidateToken` removes the auth session from the database and cache.
   * @param {string} userId - The user identifier for cache key construction.
   * @param {string} sessionId - A unique identifier for the auth session.
   */
  async invalidateToken(userId: string, sessionId: string) {
    await Promise.all([
      this.cacheManager.del(`${userId}:${sessionId}`),
      this.db.delete(authSessions).where(eq(authSessions.id, sessionId)),
    ]);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  private async cleanUpExpiredAuthSessions() {
    await this.db
      .delete(authSessions)
      .where(lt(authSessions.expiresAt, new Date()));
    console.log('Cleaned up expired auth sessions');
  }
}
