import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthStrategy } from '../enums';
import { Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import { Database } from 'src/db/types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(
  Strategy,
  AuthStrategy.GOOGLE,
) {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    super({
      clientID: configService.getOrThrow('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow('GOOGLE_SECRET'),
      callbackURL: configService.getOrThrow('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    profile.accessToken = accessToken;
    return done(null, profile);
  }
}
