import { forwardRef, Module } from '@nestjs/common';
import { CartItemsService } from './cart-items.service';
import { CartItemsController } from './cart-items.controller';
import { ProductsModule } from 'src/app/products/products.module';

@Module({
  imports: [forwardRef(() => ProductsModule)],
  controllers: [CartItemsController],
  providers: [CartItemsService],
  exports: [CartItemsService],
})
export class CartItemsModule {}
