import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthService } from 'src/auth/auth.service';
import { HttpModule } from '@nestjs/axios';
import { StripeModule } from 'src/app/stripe/stripe.module';
import { RevenueModule as DashboardRevenueModule } from 'src/dashboard/revenue/revenue.module';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    AuthModule.register({
      useFactory: (configService: ConfigService) => {
        return {
          jwtSecret: configService.get('JWT_SECRET') as string,
        };
      },
      inject: [ConfigService],
    }),
    HttpModule,
    forwardRef(() => StripeModule),
    DashboardRevenueModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
