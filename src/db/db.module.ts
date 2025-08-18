import { DynamicModule, Module } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { ConfigService } from '@nestjs/config';
import { SeedService } from './seeds/seed.service';
import { Pool } from 'pg';
import { DB_CONNECTION } from 'src/db/db-connection';
import * as schema from 'src/db/schemas';

// TODO: add indexes on those table keys that are frequently used in queries

@Module({})
export class DbModule {
  static forRoot(): DynamicModule {
    return {
      module: DbModule,
      providers: [
        {
          provide: DB_CONNECTION,
          useFactory: (configService: ConfigService) => {
            const pool = new Pool({
              connectionString: configService.getOrThrow('DB_URL'),
              ssl: false,
            });
            return drizzle(pool, {
              schema: schema,
              casing: 'snake_case',
            });
          },
          inject: [ConfigService],
        },
        SeedService,
      ],
      global: true,
      exports: [DB_CONNECTION],
    };
  }
}
