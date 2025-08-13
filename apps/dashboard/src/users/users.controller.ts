import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '@libs/auth/decorators';
import { JwtPayload } from '@libs/auth/types';
import { ParseAnythingPipe } from '@libs/global/pipes';
import { SubscriptionPlansIds } from '@libs/db/schemas';
import { GetSubscriptionsQueryDTO } from './DTOs/get-subscriptions-query.dto';

@Controller('dash/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('query') query?: string,
  ) {
    return this.usersService.findAll(page, limit, query);
  }

  @Get('subscriptions')
  getSubscriptions(@Query() query: GetSubscriptionsQueryDTO) {
    return this.usersService.getSubscriptions(query);
  }

  @Get('subscription-status/:id')
  async getSubscriptionStatus(@Param('id') id: string) {
    return this.usersService.getSubscriptionStatus(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch('toggle-influencer/:id')
  update(@User() user: JwtPayload, @Param('id') id: string) {
    return this.usersService.toggleInfluencer(+user.id, +id);
  }
}
