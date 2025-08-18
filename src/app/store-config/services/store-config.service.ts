import { DB_CONNECTION } from 'src/db/db-connection';
import { storeConfig, StoreConfig } from 'src/db/schemas';
import { Database } from 'src/db/types';
import { SOTRE_CONFIG_CACHE } from 'src/lib/constants';
import { ApiStatus } from 'src/lib/enums';
import { ApiResponse } from 'src/lib/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { eq } from 'drizzle-orm';

@Injectable()
export class StoreConfigService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async getAppConfig(): Promise<StoreConfig> {
    const cached = await this.cacheManager.get<StoreConfig>(SOTRE_CONFIG_CACHE);
    if (cached) {
      return cached;
    }
    const config = await this.db.query.storeConfig.findFirst({
      where: eq(storeConfig.id, 1),
    });
    if (!config) throw new Error('Store config not found. Please setup one');
    await this.cacheManager.set(SOTRE_CONFIG_CACHE, config, 0);
    return config;
  }

  async get(): ApiResponse<StoreConfig> {
    const config = await this.getAppConfig();

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Store config fetched successfully',
      data: config,
    };
  }
}
