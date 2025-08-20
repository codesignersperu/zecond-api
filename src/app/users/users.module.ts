import { forwardRef, Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { HttpModule } from '@nestjs/axios';
import { StripeModule } from 'src/app/stripe/stripe.module';
import { RevenueModule as DashboardRevenueModule } from 'src/dashboard/revenue/revenue.module';

@Module({
  imports: [HttpModule, forwardRef(() => StripeModule), DashboardRevenueModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
