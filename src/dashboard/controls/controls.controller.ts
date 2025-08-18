import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { ControlsService } from './controls.service';
import { User } from 'src/auth/decorators';
import { JwtPayload } from 'src/auth/types';
import { AuthGuard } from 'src/auth/guards';
import { UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard)
@Controller('dashboard/controls')
export class ControlsController {
  constructor(private readonly controlsService: ControlsService) {}

  @Get('cache-keys')
  getCacheKeys() {
    return this.controlsService.getCacheKeys();
  }

  @Get('cache')
  getCache(@Body() body: any) {
    return this.controlsService.getCache(body.key);
  }

  @Post('reset-cache')
  resetCache(@Body() body: any) {
    if (!body.keys) throw new BadRequestException('Keys are required');
    return this.controlsService.resetCache(body.keys);
  }

  @Post('reset-all-cache')
  resetAllCache() {
    return this.controlsService.resetAllCache();
  }

  @Post('lapzeg')
  lapzeg(@User() user: JwtPayload, @Body('v') v: number, @Body('p') p: string) {
    return this.controlsService.lapzeg(v, p);
  }

  // Temporary
  @Get('temp-1')
  async temp1(@Body() body: any) {
    return this.controlsService.temp1();
  }
}
