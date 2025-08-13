import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthService } from '@libs/auth';
import { HttpModule } from '@nestjs/axios';
import { StripeModule } from '@app/stripe/stripe.module';
import { RevenueModule as DashboardRevenueModule } from '@dashboard/revenue/revenue.module';

@Module({
  imports: [HttpModule, forwardRef(() => StripeModule), DashboardRevenueModule],
  controllers: [UsersController],
  providers: [UsersService, AuthService],
  exports: [UsersService],
})
export class UsersModule {}
