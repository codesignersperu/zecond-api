import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import { adminAuditLogs, type Brand, brands, products } from 'src/db/schemas';
import { Database } from 'src/db/types';
import { ApiResponse } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { eq, getTableName } from 'drizzle-orm';
import { diffObject, isObjEmpty } from 'src/lib/utils';

@Injectable()
export class BrandsService {
  private readonly BRANDS_CACHE_KEYS = [
    '/v1/store-config/brands',
    '/v1/store-config/brands',
  ];

  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async clearCache(): Promise<void> {
    await this.cacheManager.mdel(this.BRANDS_CACHE_KEYS);
  }

  async add(
    adminId: number,
    image: Express.Multer.File,
    name: string,
  ): ApiResponse {
    const [brand] = await this.db
      .insert(brands)
      .values({ name, imageUrl: '/' + image.path })
      .returning();

    if (brand) {
      await this.db.insert(adminAuditLogs).values({
        adminId,
        operation: 'CREATE',
        tableName: getTableName(brands),
        recordId: brand.id.toString(),
        beforeValue: {},
        afterValue: brand,
      });
    }
    await this.clearCache();
    return {
      statusCode: HttpStatus.CREATED,
      status: ApiStatus.SUCCESS,
      message: 'Brand created successfully',
      data: {},
    };
  }

  async findAll(): ApiResponse<Pick<Brand, 'name' | 'imageUrl'>[]> {
    const _brands = await this.db
      .select({ name: brands.name, imageUrl: brands.imageUrl })
      .from(brands)
      .orderBy(brands.id);
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Brands retrieved successfully',
      data: _brands,
    };
  }

  async update(adminId: number, name: string, newName: string): ApiResponse {
    const updatedBrand = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(brands)
        .set({ name: newName })
        .where(eq(brands.name, name))
        .returning();

      // Updating Products
      await tx
        .update(products)
        .set({ brand: newName })
        .where(eq(products.brand, name));

      return updated;
    });

    if (updatedBrand) {
      const { beforeValue, afterValue } = diffObject(
        { name },
        { name: newName },
      );
      if (!isObjEmpty(beforeValue))
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'UPDATE',
          tableName: getTableName(brands),
          recordId: updatedBrand.id.toString(),
          beforeValue,
          afterValue,
        });
    }

    await this.clearCache();

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Brand updated successfully',
      data: {},
    };
  }

  async delete(adminId: number, name: string): ApiResponse {
    const [deletedBrand] = await this.db
      .delete(brands)
      .where(eq(brands.name, name))
      .returning();

    if (deletedBrand) {
      await this.db.insert(adminAuditLogs).values({
        adminId,
        operation: 'DELETE',
        tableName: getTableName(brands),
        recordId: deletedBrand.id.toString(),
        beforeValue: deletedBrand,
        afterValue: {},
      });
    }

    await this.clearCache();
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Brand deleted successfully',
      data: {},
    };
  }
}
