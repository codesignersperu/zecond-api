import { DB_CONNECTION } from 'src/db/db-connection';
import * as schema from 'src/db/schemas';
import { Database } from 'src/db/types';
import { SOTRE_CONFIG_CACHE } from 'src/lib/constants';
import { ApiStatus } from 'src/lib/enums';
import { ApiResponse } from 'src/lib/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { eq, getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { UpdateStoreConfigDTO } from '../DTOs';
import { deleteFile, diffObject, isObjEmpty } from 'src/lib/utils';
import * as path from 'path';

@Injectable()
export class StoreConfigService {
  private readonly CONFIG_CACHE_KEYS = [
    SOTRE_CONFIG_CACHE,
    '/v1/store-config',
    '/v1/dashboard/store-config',
  ];

  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async clearCache(): Promise<void> {
    await this.cacheManager.mdel(this.CONFIG_CACHE_KEYS);
  }

  async getAppConfig(): Promise<schema.StoreConfig> {
    const cached =
      await this.cacheManager.get<schema.StoreConfig>(SOTRE_CONFIG_CACHE);
    if (cached) {
      return cached;
    }
    const config = await this.db.query.storeConfig.findFirst({
      where: eq(schema.storeConfig.id, 1),
    });
    if (!config) throw new Error('Store config not found. Please setup one');
    await this.cacheManager.set(SOTRE_CONFIG_CACHE, config, 0);
    return config;
  }

  async get(): ApiResponse<schema.StoreConfig> {
    const config = await this.getAppConfig();

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Store config fetched successfully',
      data: config,
    };
  }

  async update(
    adminId: number,
    data: UpdateStoreConfigDTO,
    images: Array<Express.Multer.File>,
  ): ApiResponse {
    let imagesToDel: string[] = [];
    let filteredData: UpdateStoreConfigDTO = {};
    Object.entries(data).forEach(([key, v]) => {
      if (v !== undefined || v !== null || v !== '') {
        filteredData[key] = v;
      }
    });

    if (filteredData.banners) {
      filteredData.banners = filteredData.banners.map((v) => {
        if (!v[2]) return v;
        imagesToDel.push(v[0]);
        const newImage = images.find((image) => image.size === +v[2]);
        if (newImage) return ['/' + newImage.path, v[1]];
        else return [v[0], v[1]];
      });
    }

    if (filteredData.mobileBanners) {
      filteredData.mobileBanners = filteredData.mobileBanners.map((v) => {
        if (!v[2]) return v;
        imagesToDel.push(v[0]);
        const newImage = images.find((image) => image.size === +v[2]);
        if (newImage) return ['/' + newImage.path, v[1]];
        else return [v[0], v[1]];
      });
    }

    if (isObjEmpty(filteredData))
      throw new BadRequestException('No data to update');

    const [prev] = await this.db
      .select()
      .from(schema.storeConfig)
      .where(eq(schema.storeConfig.id, 1));

    const [updated] = await this.db
      .update(schema.storeConfig)
      .set(filteredData)
      .where(eq(schema.storeConfig.id, 1))
      .returning();

    if (updated) {
      // Clearing Cache
      await this.clearCache();

      // Entering Audit entry
      const { beforeValue, afterValue } = diffObject(prev, updated);
      if (!isObjEmpty(beforeValue))
        await this.db.insert(schema.adminAuditLogs).values({
          adminId,
          operation: 'UPDATE',
          tableName: getTableName(schema.storeConfig),
          recordId: updated.id.toString(),
          beforeValue,
          afterValue,
        });
    }

    // Deleting the discarded image files
    imagesToDel.forEach(async (url) => {
      await deleteFile(path.join(process.cwd(), url));
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Store config updated successfully',
      data: {},
    };
  }

  async getDbTables(): ApiResponse<string[]> {
    const tables = Object.values(schema).filter((table) => is(table, PgTable));
    const tableNames: string[] = tables.map((table) => getTableName(table));
    tableNames.push('coupons');
    tableNames.push('promotion_codes');

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Tables fetched successfully',
      data: tableNames,
    };
  }
}
