import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { z } from 'zod';
import Keyv from 'keyv';
import KeyvValkey from '@keyv/valkey';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from 'src/db';
import {
  APP_FILTER,
  APP_INTERCEPTOR,
  APP_PIPE,
  RouterModule,
} from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { LapzegInterceptor } from 'src/lib/interceptors';
import { Database } from 'src/db/types';
import { GlobalExceptionFilter } from 'src/lib/filters';
import { DB_CONNECTION } from 'src/db/db-connection';
import { AppModule } from 'src/app/app.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const schema = z.object({
          APP_PORT: z
            .string()
            .min(4)
            .transform((v) => Number(v)),
          APP_URL: z.string(),
          FRONTEND_URL: z.string(),
          DB_URL: z.string().url(),
          VALKEY_URL: z.string().url(),
          JWT_SECRET: z.string(),
          JWT_EXPIRY: z.string().transform((v) => Number(v)),
          SUPPORTED_FILE_TYPES: z.string(),
          MAX_FILE_SIZE: z.string().transform((v) => Number(v)),
          CLIENT_OAUTH_REDIRECT: z.string(),
          GOOGLE_CLIENT_ID: z.string(),
          GOOGLE_SECRET: z.string(),
          GOOGLE_CALLBACK_URL: z.string(),
          STRIPE_SECRET: z.string(),
          STRIPE_WEBHOOK_SECRET: z.string(),
        });

        const parsed = schema.safeParse(config);
        if (!parsed.success) {
          const requiredVars = parsed.error.issues.map((v) => v.path[0]);
          console.error(
            `%c Invalid Application Configuration
Required Variables: ${requiredVars.join(', ')}
Please ensure that all required variables are set correctly.
Shutting down...`,
          );
          process.exit(1);
        }

        return parsed.data;
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService) => ({
        ttl: 30 * 60 * 1000, // 30 mins
        stores: new Keyv({
          store: new KeyvValkey(configService.getOrThrow('VALKEY_URL')),
        }),
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'),
      serveRoot: '/uploads/',
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: { url: configService.getOrThrow('VALKEY_URL') },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    DbModule.forRoot(),
    AuthModule.forRoot(),
    AppModule,
    DashboardModule,
  ],
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
export class MainModule {}
