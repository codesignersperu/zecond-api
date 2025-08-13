import { Module } from '@nestjs/common';
import { RevenueService, InternalRevenueService } from './services';
import { RevenueController } from './revenue.controller';

@Module({
  controllers: [RevenueController],
  providers: [RevenueService, InternalRevenueService],
  exports: [InternalRevenueService],
})
export class RevenueModule {}
