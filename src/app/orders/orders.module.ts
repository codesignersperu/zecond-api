import { forwardRef, Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { StripeModule } from 'src/app/stripe/stripe.module';
import { StripeModule as DashboardStripeModule } from 'src/dashboard/stripe/stripe.module';
import { OrdersModule as DashboardOrdersModule } from 'src/dashboard/orders/orders.module';
import { StoreConfigModule } from 'src/app/store-config/store-config.module';
import { RevenueModule as DashboardRevenueModule } from 'src/dashboard/revenue/revenue.module';

@Module({
  imports: [
    forwardRef(() => StripeModule),
    DashboardStripeModule,
    DashboardOrdersModule,
    StoreConfigModule,
    DashboardRevenueModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
