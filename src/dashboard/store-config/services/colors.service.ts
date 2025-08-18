import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import {
  adminAuditLogs,
  type Brand,
  brands,
  colors,
  products,
} from 'src/db/schemas';
import { Database } from 'src/db/types';
import { ApiResponse } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { eq, getTableName } from 'drizzle-orm';
import { diffObject, isObjEmpty } from 'src/lib/utils';

@Injectable()
export class ColorsService {
  private readonly COLORS_CACHE_KEYS = [
    '/v1/store-config/colors',
    '/v1/store-config/colors',
  ];

  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async clearCache(): Promise<void> {
    await this.cacheManager.mdel(this.COLORS_CACHE_KEYS);
  }

  async add(adminId: number, name: string, code: string): ApiResponse {
    const [color] = await this.db
      .insert(colors)
      .values({ name, code })
      .returning();
    await this.clearCache();

    if (color) {
      await this.db.insert(adminAuditLogs).values({
        adminId,
        operation: 'CREATE',
        tableName: getTableName(colors),
        recordId: color.id.toString(),
        beforeValue: {},
        afterValue: color,
      });
    }
    return {
      statusCode: HttpStatus.CREATED,
      status: ApiStatus.SUCCESS,
      message: 'Color added successfully',
      data: {},
    };
  }

  async findAll(): ApiResponse<[string, string][]> {
    const _colors = await this.db
      .select({ n: colors.name, c: colors.code })
      .from(colors)
      .orderBy(colors.id);
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Colors retrieved successfully',
      data: _colors.map((v) => [v.n, v.c]),
    };
  }

  async update(
    adminId: number,
    name: string,
    newName: string,
    code: string,
  ): ApiResponse {
    const color = await this.db.transaction(async (tx) => {
      const [color] = await tx
        .update(colors)
        .set({ name: newName, code })
        .where(eq(colors.name, name))
        .returning();

      // Updating Products
      await tx
        .update(products)
        .set({ color: newName, colorCode: code })
        .where(eq(products.color, name));
      return color;
    });
    await this.clearCache();

    if (color) {
      const { beforeValue, afterValue } = diffObject(
        { name, code },
        { name: newName, code },
      );

      if (!isObjEmpty(beforeValue))
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'UPDATE',
          tableName: getTableName(colors),
          recordId: color.id.toString(),
          beforeValue,
          afterValue,
        });
    }
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Color updated successfully',
      data: {},
    };
  }

  async delete(adminId: number, name: string): ApiResponse {
    const [color] = await this.db
      .delete(colors)
      .where(eq(colors.name, name))
      .returning();
    await this.clearCache();

    if (color) {
      await this.db.insert(adminAuditLogs).values({
        adminId,
        operation: 'DELETE',
        tableName: getTableName(colors),
        recordId: color.id.toString(),
        beforeValue: color,
        afterValue: {},
      });
    }
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Color deleted successfully',
      data: {},
    };
  }
}
