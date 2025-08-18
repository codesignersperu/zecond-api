import { forwardRef, Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { AddressesModule } from 'src/app/addresses/addresses.module';
import { ProductsModule } from 'src/app/products/products.module';
import { OrdersModule } from 'src/app/orders/orders.module';
import { UsersModule } from 'src/app/users/users.module';
import { StripeModule as DashboardStripeModule } from 'src/dashboard/stripe/stripe.module';
import { StoreConfigModule } from '../store-config/store-config.module';

@Module({
  imports: [
    AddressesModule,
    ProductsModule,
    StoreConfigModule,
    forwardRef(() => OrdersModule),
    forwardRef(() => UsersModule),
    DashboardStripeModule,
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
