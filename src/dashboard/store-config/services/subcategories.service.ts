import {
  Injectable,
  Inject,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import {
  adminAuditLogs,
  categories,
  products,
  subcategories,
} from 'src/db/schemas';
import { Database } from 'src/db/types';
import { and, eq, getTableName } from 'drizzle-orm';
import { ApiResponse } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';
import { CategoriesService } from './categories.service';
import { diffObject, isObjEmpty } from 'src/lib/utils';

@Injectable()
export class SubcategoriesService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly categoriesService: CategoriesService,
  ) {}

  async add(
    adminId: number,
    categoryId: number,
    name: string,
    iconKey: string,
  ): ApiResponse {
    const [subcategory] = await this.db
      .insert(subcategories)
      .values({ categoryId, name, iconKey })
      .returning();
    await this.categoriesService.clearCache();

    if (subcategory) {
      await this.db.insert(adminAuditLogs).values({
        adminId,
        operation: 'CREATE',
        tableName: getTableName(subcategories),
        recordId: subcategory.id.toString(),
        beforeValue: {},
        afterValue: subcategory,
      });
    }
    return {
      statusCode: HttpStatus.CREATED,
      status: ApiStatus.SUCCESS,
      message: 'Subcategory added successfully',
      data: {},
    };
  }

  async update(
    adminId: number,
    categoryId: number,
    name: string,
    newName: string,
    iconKey: string,
  ): ApiResponse {
    const subcategory = await this.db.transaction(async (tx) => {
      const category = await tx.query.categories.findFirst({
        where: eq(categories.id, categoryId),
        columns: { name: true },
      });

      if (!category)
        throw new BadRequestException(
          'Category with id: ' + categoryId + " doesn't exist",
        );

      const [updated] = await tx
        .update(subcategories)
        .set({ name: newName, iconKey })
        .where(
          and(
            eq(subcategories.name, name),
            eq(subcategories.categoryId, categoryId),
          ),
        )
        .returning();

      // Updating Products
      await tx
        .update(products)
        .set({ subcategory: newName })
        .where(
          and(
            eq(products.category, category.name),
            eq(products.subcategory, name),
          ),
        );

      return updated;
    });
    await this.categoriesService.clearCache();

    if (subcategory) {
      const { beforeValue, afterValue } = diffObject(
        { name, iconKey },
        { name: newName, iconKey },
      );
      if (!isObjEmpty(beforeValue))
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'UPDATE',
          tableName: getTableName(subcategories),
          recordId: subcategory.id.toString(),
          beforeValue,
          afterValue,
        });
    }
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Subcategory updated successfully',
      data: {},
    };
  }

  async delete(adminId: number, categoryId: number, name: string): ApiResponse {
    const [subcategory] = await this.db
      .delete(subcategories)
      .where(
        and(
          eq(subcategories.name, name),
          eq(subcategories.categoryId, categoryId),
        ),
      )
      .returning();
    await this.categoriesService.clearCache();

    if (subcategory) {
      await this.db.insert(adminAuditLogs).values({
        adminId,
        operation: 'DELETE',
        tableName: getTableName(subcategories),
        recordId: subcategory.id.toString(),
        beforeValue: subcategory,
        afterValue: {},
      });
    }
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Subcategory deleted successfully',
      data: {},
    };
  }
}
