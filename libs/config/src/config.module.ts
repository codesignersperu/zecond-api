import KeyvValkey from '@keyv/valkey';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import Keyv from 'keyv';
import { join } from 'path';
import { z } from 'zod';

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
          DASHBOARD_PORT: z
            .string()
            .min(4)
            .transform((v) => Number(v)),
          APP_URL: z.string(),
          FRONTEND_URL: z.string(),
          DB_URL: z.string().url(),
          VALKEY_URL: z.string().url(),
          ADMIN_JWT_SECRET: z.string(),
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
      rootPath: join(__dirname, '..', '..', '..', 'uploads'),
      serveRoot: '/uploads/',
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: { url: configService.getOrThrow('VALKEY_URL') },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
  ],
})
export class AppConfigModule {}
