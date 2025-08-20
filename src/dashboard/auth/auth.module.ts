import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as RootAuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';

@Module({
  imports: [
    RootAuthModule.register({
      useFactory: (configService: ConfigService) => {
        return {
          jwtSecret: configService.get('ADMIN_JWT_SECRET') as string,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
