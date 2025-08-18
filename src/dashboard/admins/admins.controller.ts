import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AdminsService } from './admins.service';
import { CreateAdminDto, AdminLoginDto } from './DTOs';
import { PublicRoute, User } from 'src/auth/decorators';
import type { JwtPayload } from 'src/auth/types';
import { RootAdminGuard } from './guards';
import { ParseAnythingPipe } from 'src/lib/pipes';
import { AdminAuditLogsOperations } from 'src/db/schemas';
import { AuditLogTimeFrame } from './types';
import { AuthGuard } from 'src/auth/guards';

@UseGuards(AuthGuard)
@Controller('dashboard/admins')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post('login')
  @PublicRoute()
  login(@Body() createAdminDto: AdminLoginDto) {
    return this.adminsService.login(createAdminDto);
  }

  @Post()
  @UseGuards(RootAdminGuard)
  create(@User() user: JwtPayload, @Body() createAdminDto: CreateAdminDto) {
    return this.adminsService.create(+user.id, createAdminDto);
  }

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminsService.findAll(page, limit);
  }

  @Get('me')
  findOne(@User() user: JwtPayload) {
    return this.adminsService.findOne(+user.id);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query(
      'adminId',
      new ParseAnythingPipe({ expectedValue: 'number', optional: true }),
    )
    adminId?: number,
    @Query(
      'tableName',
      new ParseAnythingPipe({ expectedValue: 'string', optional: true }),
    )
    tableName?: string,
    @Query(
      'operation',
      new ParseAnythingPipe<AdminAuditLogsOperations>({
        expectedEnum: ['CREATE', 'UPDATE', 'DELETE'],
        optional: true,
      }),
    )
    operation?: AdminAuditLogsOperations,
    @Query(
      'timeFrame',
      new ParseAnythingPipe<AuditLogTimeFrame>({
        expectedEnum: ['today', 'yesterday', 'last-week', 'last-month'],
        optional: true,
      }),
    )
    timeFrame?: AuditLogTimeFrame,
  ) {
    return this.adminsService.getAuditLogs(
      page,
      limit,
      adminId,
      tableName,
      operation,
      timeFrame,
    );
  }

  @Delete(':id')
  @UseGuards(RootAdminGuard)
  remove(@User() user: JwtPayload, @Param('id') id: string) {
    return this.adminsService.remove(+user.id, +id);
  }
}
