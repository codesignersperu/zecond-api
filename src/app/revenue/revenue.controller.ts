import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RevenueService } from './revenue.service';
import { AuthGuard } from 'src/auth/guards';
import {
  AddWithdrawalAccountDTO,
  GetTransactionsQueryDTO,
  WithdrawalRequsetDTO,
} from './DTOs';
import { ApiOperation } from '@nestjs/swagger';
import { ActiveUserOnly, User } from 'src/auth/decorators';

@UseGuards(AuthGuard)
@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('transactions')
  @ApiOperation({
    summary: 'Gets users transactions like sales, withdrawal requests',
  })
  getTransactions(
    @User('id') userId: string,
    @Query() query: GetTransactionsQueryDTO,
  ) {
    return this.revenueService.getTransactions(+userId, query);
  }

  @Get('balance')
  @ApiOperation({
    summary: 'Gets users balance',
  })
  getBalance(@User('id') userId: string) {
    return this.revenueService.getBalance(+userId);
  }

  // Withdrawal Requests/Accounts
  @Post('withdrawal/request')
  @ActiveUserOnly()
  @ApiOperation({
    summary: "let's user create a withdrawal request",
  })
  createWithdrawalRequest(
    @User('id') userId: string,
    @Body() body: WithdrawalRequsetDTO,
  ) {
    return this.revenueService.createWithdrawalRequest(+userId, body);
  }

  @Post('withdrawal/accounts')
  @ActiveUserOnly()
  @ApiOperation({
    summary: "let's user add a withdrawal account",
  })
  addWithdrawalAccount(
    @User('id') userId: string,
    @Body() body: AddWithdrawalAccountDTO,
  ) {
    return this.revenueService.addWithdrawalAccount(+userId, body);
  }

  @Get('withdrawal/accounts')
  @ApiOperation({
    summary: "Fetches users's withdrawal accounts",
  })
  getWithdrawalAccounts(@User('id') userId: string) {
    return this.revenueService.getWithdrawalAccounts(+userId);
  }

  @Delete('withdrawal/accounts/:accountId')
  @ActiveUserOnly()
  @ApiOperation({
    summary: "Deletes users's withdrawal account",
  })
  deleteWithdrawalAccount(
    @User('id') userId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.revenueService.deleteWithdrawalAccount(+userId, +accountId);
  }
}
