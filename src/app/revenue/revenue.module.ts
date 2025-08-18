import { Module } from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';
import { RevenueModule as DashboardRevenueModule } from 'src/dashboard/revenue/revenue.module';
import { StoreConfigModule } from 'src/app/store-config/store-config.module';

@Module({
  imports: [DashboardRevenueModule, StoreConfigModule],
  controllers: [RevenueController],
  providers: [RevenueService],
})
export class RevenueModule {}
