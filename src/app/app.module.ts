import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { AddressesModule } from './addresses/addresses.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { StoreConfigModule } from './store-config/store-config.module';
import { CartItemsModule } from './cart-items/cart-items.module';
import { StripeModule } from './stripe/stripe.module';
import { RevenueModule } from './revenue/revenue.module';

@Module({
  imports: [
    AuthModule.forRoot({
      useFactory: (configService: ConfigService) => {
        return {
          jwtSecret: configService.get('JWT_SECRET') as string,
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    ProductsModule,
    AddressesModule,
    NotificationsModule,
    OrdersModule,
    StoreConfigModule,
    CartItemsModule,
    StripeModule,
    RevenueModule,
  ],
})
export class AppModule {}
