import { Controller, Get, Query } from '@nestjs/common';
import { StoreStatsService } from './store-stats.service';
import { ErrorLogsQueryDTO } from './DTOs';
import { AuthGuard } from 'src/auth/guards';
import { UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard)
@Controller('dashboard/store-stats')
export class StoreStatsController {
  constructor(private readonly storeStatsService: StoreStatsService) {}
  @Get()
  getStats() {
    return this.storeStatsService.getStats();
  }

  @Get('error-logs')
  getErrorLogs(@Query() query: ErrorLogsQueryDTO) {
    return this.storeStatsService.getErrorLogs(query);
  }
}
