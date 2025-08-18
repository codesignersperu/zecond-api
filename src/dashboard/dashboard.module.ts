import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigService } from '@nestjs/config';
import { AdminsModule } from './admins/admins.module';
import { UsersModule } from './users/users.module';
import { StoreStatsModule } from './store-stats/store-stats.module';
import { ProductsModule } from './products/products.module';
import { ControlsModule } from './controls/controls.module';
import { StoreConfigModule } from './store-config/store-config.module';
import { OrdersModule } from './orders/orders.module';
import { StripeModule } from './stripe/stripe.module';
import { RevenueModule } from './revenue/revenue.module';

@Module({
  imports: [
    AuthModule.forRoot({
      useFactory: (config: ConfigService) => {
        return {
          jwtSecret: config.get('ADMIN_JWT_SECRET') as string,
        };
      },
      inject: [ConfigService],
    }),
    AdminsModule,
    UsersModule,
    StoreStatsModule,
    ProductsModule,
    ControlsModule,
    StoreConfigModule,
    OrdersModule,
    StripeModule,
    RevenueModule,
  ],
})
export class DashboardModule {}
