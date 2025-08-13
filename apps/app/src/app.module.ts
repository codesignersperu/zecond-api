import { Module } from '@nestjs/common';
import { AppConfigModule } from '@libs/config';
import { ConfigService } from '@nestjs/config';
import { ZodValidationPipe } from 'nestjs-zod';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { DbModule } from '@libs/db';
import { AuthModule } from '@libs/auth';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { AddressesModule } from './addresses/addresses.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { StoreConfigModule } from './store-config/store-config.module';
import { CartItemsModule } from './cart-items/cart-items.module';
import { StripeModule } from './stripe/stripe.module';
import { LapzegInterceptor } from '@libs/global/interceptors';
import { RevenueModule } from './revenue/revenue.module';
import { GlobalExceptionFilter } from '@libs/global/filters';
import { DB_CONNECTION } from '@libs/db/db-connection';
import { Database } from '@libs/db/types';

@Module({
  imports: [
    AppConfigModule,
    DbModule.forRoot(),
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
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LapzegInterceptor,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_FILTER,
      useFactory: (db: Database) => {
        return new GlobalExceptionFilter(db);
      },
      inject: [DB_CONNECTION],
    },
  ],
})
export class AppModule {}
