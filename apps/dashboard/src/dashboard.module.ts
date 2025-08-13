import { Module } from '@nestjs/common';
import { AppConfigModule } from '@libs/config';
import { DbModule } from '@libs/db/db.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { AuthModule } from '@libs/auth';
import { ConfigService } from '@nestjs/config';
import { AdminsModule } from './admins/admins.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { UsersModule } from './users/users.module';
import { StoreStatsModule } from './store-stats/store-stats.module';
import { ProductsModule } from './products/products.module';
import { ControlsModule } from './controls/controls.module';
import { StoreConfigModule } from './store-config/store-config.module';
import { OrdersModule } from './orders/orders.module';
import { AuthGuard } from '@libs/auth/guards';
import { StripeModule } from './stripe/stripe.module';
import { LapzegInterceptor } from '@libs/global/interceptors';
import { GlobalExceptionFilter } from '@libs/global/filters';
import { DB_CONNECTION } from '@libs/db/db-connection';
import { Database } from '@libs/db/types';
import { RevenueModule } from './revenue/revenue.module';

@Module({
  imports: [
    AppConfigModule,
    DbModule.forRoot(),
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
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LapzegInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
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
export class DashboardModule {}
