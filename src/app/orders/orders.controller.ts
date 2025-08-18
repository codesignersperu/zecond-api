import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderDto } from './DTOs';
import { AuthGuard } from 'src/auth/guards';
import { ApiOperation } from '@nestjs/swagger';
import { ActiveUserOnly, User } from 'src/auth/decorators';

@Controller('orders')
@UseGuards(AuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all orders of a user',
  })
  findAll(@User('id') userId: string) {
    return this.ordersService.findAll(+userId);
  }

  @Get('by-checkout-id/:id')
  @ApiOperation({
    summary: 'Get an order by id of a user',
  })
  findByCheckoutId(@User('id') userId: string, @Param('id') id: string) {
    return this.ordersService.findByCheckoutId(+userId, id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an order by id of a user',
  })
  findOne(@User('id') userId: string, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(+userId, id);
  }

  @Patch(':id')
  @ActiveUserOnly()
  @ApiOperation({
    summary: 'Update an order by id of a user',
  })
  update(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(+userId, +id, updateOrderDto);
  }
}
