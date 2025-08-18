import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RevenueService } from './services';
import { GetTransactionsQueryDTO, WithdrawalActionDTO } from './DTOs';
import { ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';
import { AuthGuard } from 'src/auth/guards';
import { UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard)
@Controller('dashboard/revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('transactions')
  getTransactions(@Query() query: GetTransactionsQueryDTO) {
    return this.revenueService.getTransactions(query);
  }

  @Post('withdrawal-action/:id')
  approveWithdrawal(
    @Param('id', new ZodValidationPipe(z.coerce.number())) id: number,
    @Body() body: WithdrawalActionDTO,
  ) {
    return this.revenueService.approveWithdrawal(id, body);
  }
}
