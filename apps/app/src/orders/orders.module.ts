import { forwardRef, Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { StripeModule } from '@app/stripe/stripe.module';
import { StripeModule as DashboardStripeModule } from '@dashboard/stripe/stripe.module';
import { OrdersModule as DashboardOrdersModule } from '@dashboard/orders/orders.module';
import { StoreConfigModule } from '@app/store-config/store-config.module';
import { RevenueModule as DashboardRevenueModule } from '@dashboard/revenue/revenue.module';

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
