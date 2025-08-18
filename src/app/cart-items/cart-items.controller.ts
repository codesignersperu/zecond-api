import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CartItemsService } from './cart-items.service';
import { ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards';
import { ActiveUserOnly, User } from 'src/auth/decorators';

@Controller('cart-items')
@UseGuards(AuthGuard)
export class CartItemsController {
  constructor(private readonly cartItemsService: CartItemsService) {}

  @Post(':productId')
  @ActiveUserOnly()
  @ApiOperation({
    description: "Adds a product to user's cart",
  })
  add(@User('id') userId: string, @Param('productId') productId: string) {
    return this.cartItemsService.add(+userId, +productId);
  }

  @Get()
  @ApiOperation({
    description: 'Gets all cart items of a user',
  })
  findAll(@User('id') userId: string) {
    return this.cartItemsService.findAll(+userId);
  }

  @Get(':id')
  @ApiOperation({
    description: 'Gets a cart items of a user by id',
  })
  findOne(@User('id') userId: string, @Param('id') id: string) {
    return this.cartItemsService.findOne(+userId, +id);
  }

  @Delete(':id')
  @ActiveUserOnly()
  @ApiOperation({
    description: 'Removes a cart items of a user by id',
  })
  remove(@User('id') userId: string, @Param('id') id: string) {
    return this.cartItemsService.remove(+userId, +id);
  }
}
