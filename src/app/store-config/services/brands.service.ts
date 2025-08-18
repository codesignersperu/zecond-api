import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import { brands, type Brand } from 'src/db/schemas';
import { Database } from 'src/db/types';
import { eq } from 'drizzle-orm';
import { ApiResponse } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';

@Injectable()
export class BrandsService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
  ) {}

  async findAll(): ApiResponse<Pick<Brand, 'name' | 'imageUrl'>[]> {
    const _brands = await this.db
      .select({ name: brands.name, imageUrl: brands.imageUrl })
      .from(brands);
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Brands retrieved successfully',
      data: _brands,
    };
  }

  async findOne(id: number) {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(eq(brands.id, id));
    return brand;
  }
}
