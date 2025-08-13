import { Module } from '@nestjs/common';
import { StoreStatsService } from './store-stats.service';
import { StoreStatsController } from './store-stats.controller';

@Module({
  controllers: [StoreStatsController],
  providers: [StoreStatsService],
})
export class StoreStatsModule {}
