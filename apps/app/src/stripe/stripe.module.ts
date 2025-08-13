import { forwardRef, Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { AddressesModule } from '@app/addresses/addresses.module';
import { ProductsModule } from '@app/products/products.module';
import { OrdersModule } from '@app/orders/orders.module';
import { UsersModule } from '@app/users/users.module';
import { StripeModule as DashboardStripeModule } from '@dashboard/stripe/stripe.module';

@Module({
  imports: [
    AddressesModule,
    ProductsModule,
    forwardRef(() => OrdersModule),
    forwardRef(() => UsersModule),
    DashboardStripeModule,
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
