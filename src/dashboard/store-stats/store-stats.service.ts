import { DB_CONNECTION } from 'src/db/db-connection';
import { admins, errorLogs, users } from 'src/db/schemas';
import { Database } from 'src/db/types';
import { ApiStatus } from 'src/lib/enums';
import { ApiResponse } from 'src/lib/types';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ErrorLogsQueryDTO } from './DTOs';
import { calcPagination } from 'src/lib/utils';
import { count, desc } from 'drizzle-orm';

@Injectable()
export class StoreStatsService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
  ) {}

  async getStats(): ApiResponse<{
    users: number;
    admins: number;
  }> {
    const _users = await this.db.$count(users);
    const _admins = await this.db.$count(admins);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched users successfully',
      data: {
        users: _users,
        admins: _admins,
      },
    };
  }

  async getErrorLogs(query: ErrorLogsQueryDTO): ApiResponse {
    const { offset, limit, pagination } = await calcPagination(
      this.db
        .select({ total: count(errorLogs.id) })
        .from(errorLogs)
        .$dynamic(),
      query.page,
      query.limit,
    );

    const logs = await this.db.query.errorLogs.findMany({
      orderBy: desc(errorLogs.createdAt),
      offset,
      limit,
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched error logs successfully',
      data: {
        logs,
        pagination,
      },
    };
  }
}
