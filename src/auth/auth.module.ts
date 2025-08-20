import { DynamicModule, Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { GoogleStrategy, JwtStrategy } from './strategies';

@Module({})
export class AuthModule {
  static forRoot(): DynamicModule {
    return {
      module: AuthModule,
      global: true,
      imports: [JwtModule.register({})],
      providers: [JwtService, JwtStrategy, GoogleStrategy, AuthService],
      exports: [JwtService, AuthService],
    };
  }
}
