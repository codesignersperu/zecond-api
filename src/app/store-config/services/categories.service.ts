import { Injectable, Inject, HttpStatus } from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import { categories, subcategories } from 'src/db/schemas';
import { Database } from 'src/db/types';
import { asc, eq } from 'drizzle-orm';
import { ApiStatus } from 'src/lib/enums';
import { ApiResponse } from 'src/lib/types';
import { CategoriesResponse } from 'src/dashboard/store-config/types';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
  ) {}

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

  async findById(id: number) {
    const [category] = await this.db
      .select({ c: categories.name })
      .from(categories)
      .where(eq(categories.id, id));

    return category.c;
  }
}
