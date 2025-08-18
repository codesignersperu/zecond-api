import { Injectable, Inject, HttpStatus } from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import {
  adminAuditLogs,
  categories,
  products,
  subcategories,
} from 'src/db/schemas';
import { Database } from 'src/db/types';
import { asc, eq, getTableName } from 'drizzle-orm';
import { ApiStatus } from 'src/lib/enums';
import { ApiResponse } from 'src/lib/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CategoriesResponse } from '../types';
import { diffObject, isObjEmpty } from 'src/lib/utils';

@Injectable()
export class CategoriesService {
  private readonly API_CACHE_KEYS = [
    '/v1/store-config/categories-subcategories',
    '/v1/store-config/categories-subcategories',
  ];

  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async clearCache() {
    await this.cacheManager.mdel(this.API_CACHE_KEYS);
  }

  async add(adminId: number, name: string): ApiResponse {
    const [category] = await this.db
      .insert(categories)
      .values({ name })
      .returning();
    await this.clearCache();

    if (category) {
      await this.db.insert(adminAuditLogs).values({
        adminId,
        operation: 'CREATE',
        tableName: getTableName(categories),
        recordId: category.id.toString(),
        beforeValue: {},
        afterValue: category,
      });
    }
    return {
      statusCode: HttpStatus.CREATED,
      status: ApiStatus.SUCCESS,
      message: 'Category created successfully',
      data: {},
    };
  }

  async findAll(): ApiResponse<CategoriesResponse> {
    const _categories = await this.db.query.categories.findMany({
      columns: {
        name: true,
        id: true,
      },
      with: {
        subcategories: {
          columns: {
            name: true,
            iconKey: true,
          },
          orderBy: asc(subcategories.id),
        },
      },
      orderBy: asc(categories.id),
    });

    const res = _categories.reduce((acc, category) => {
      acc[category.name] = {} as any;
      acc[category.name].id = category.id;
      acc[category.name].subcategories = category.subcategories.map(
        (subcategory) => [subcategory.name, `${subcategory.iconKey}`],
      );
      return acc;
    }, {} as CategoriesResponse);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Categories retrieved successfully',
      data: res,
    };
  }

  async update(adminId: number, name: string, newName: string): ApiResponse {
    const category = await this.db.transaction(async (tx) => {
      const [category] = await tx
        .update(categories)
        .set({ name: newName })
        .where(eq(categories.name, name))
        .returning();

      // Updating Products
      await tx
        .update(products)
        .set({ category: newName })
        .where(eq(products.category, name));

      return category;
    });
    await this.clearCache();

    if (category) {
      const { beforeValue, afterValue } = diffObject(
        { name },
        { name: newName },
      );
      if (!isObjEmpty(beforeValue))
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'UPDATE',
          tableName: getTableName(categories),
          recordId: category.id.toString(),
          beforeValue,
          afterValue,
        });
    }

    return {
      statusCode: HttpStatus.CREATED,
      status: ApiStatus.SUCCESS,
      message: 'Category updated successfully',
      data: {},
    };
  }

  async delete(adminId: number, name: string): ApiResponse {
    const [category] = await this.db
      .delete(categories)
      .where(eq(categories.name, name))
      .returning();
    await this.clearCache();

    if (category) {
      await this.db.insert(adminAuditLogs).values({
        adminId,
        operation: 'DELETE',
        tableName: getTableName(categories),
        recordId: category.id.toString(),
        beforeValue: category,
        afterValue: {},
      });
    }
    return {
      statusCode: HttpStatus.CREATED,
      status: ApiStatus.SUCCESS,
      message: 'Category deleted successfully',
      data: {},
    };
  }
}
