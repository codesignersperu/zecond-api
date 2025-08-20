import { Controller, Get, Body, Patch, Param, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { GetOrdersQueryDTO, UpdateOrderDto } from './DTOs';
import { User } from 'src/auth/decorators';
import { AuthGuard } from 'src/auth/guards';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles-decorator';
import { Role } from 'src/auth/enums';

@UseGuards(AuthGuard)
@Roles([Role.ADMIN])
@Controller('dashboard/orders')
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
