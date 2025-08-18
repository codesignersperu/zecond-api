import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import { colors } from 'src/db/schemas';
import { Database } from 'src/db/types';
import { ApiResponse } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';

@Injectable()
export class ColorsService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
  ) {}

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
}
