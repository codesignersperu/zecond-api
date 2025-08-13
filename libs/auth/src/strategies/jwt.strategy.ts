import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JwtPayload } from '../types';
import { AuthStrategy } from '../enums';
import { AUTH_CONFIG_PROVIDER } from '../constants';
import type { AuthModuleOptions, AuthRequestMetadata } from '../types';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, AuthStrategy.JWT) {
  constructor(
    @Inject(AUTH_CONFIG_PROVIDER) private readonly options: AuthModuleOptions,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: options.jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload): Promise<JwtPayload> {
    const requestMetadata = req.metadata as AuthRequestMetadata;
    return this.authService.validateToken(
      payload,
      requestMetadata.isActiveUserOnly,
    );
  }
}
