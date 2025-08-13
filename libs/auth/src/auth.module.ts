import { DynamicModule, Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthService } from './auth.service';
import { GoogleStrategy, JwtStrategy } from './strategies';
import { DbModule } from '@libs/db';
import { AUTH_CONFIG_PROVIDER } from './constants';
import type { AuthModuleAsyncOptions } from './types';
import { AppConfigModule } from '@libs/config';

@Module({})
export class AuthModule {
  static forRoot(options: AuthModuleAsyncOptions): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      imports: [
        AppConfigModule,
        ...(options.imports || []),
        JwtModule.register({}),
        DbModule.forRoot(),
      ],
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
