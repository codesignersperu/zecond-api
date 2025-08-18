import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from 'src/auth/guards';
import { ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtPayload } from 'src/auth/types';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Returns all notifications of a user',
  })
  findAll(@Req() request: Request) {
    const user = request.user as JwtPayload;
    return this.notificationsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Returns a notification by id',
  })
  findOne(@Req() request: Request, @Param('id') id: string) {
    const user = request.user as JwtPayload;
    return this.notificationsService.findOne(+user.id, +id);
  }
}
