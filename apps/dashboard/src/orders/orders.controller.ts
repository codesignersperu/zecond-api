import { Controller, Get, Body, Patch, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { GetOrdersQueryDTO, UpdateOrderDto } from './DTOs';
import { User } from '@libs/auth/decorators';

@Controller('dash/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: GetOrdersQueryDTO) {
    return this.ordersService.findAll(query);
  }

  @Patch(':id')
  update(
    @User('id') adminId: string,
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(+adminId, +id, updateOrderDto);
  }
}
