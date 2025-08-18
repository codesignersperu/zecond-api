import { DynamicModule, Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { GoogleStrategy, JwtStrategy } from './strategies';
import { AUTH_CONFIG_PROVIDER } from './constants';
import type { AuthModuleAsyncOptions } from './types';

@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleAsyncOptions): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      imports: [JwtModule.register({})],
      providers: [
        {
          provide: AUTH_CONFIG_PROVIDER,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        JwtService,
        JwtStrategy,
        GoogleStrategy,
        AuthService,
      ],
      exports: [AUTH_CONFIG_PROVIDER, JwtService, AuthService],
    };
  }
}
