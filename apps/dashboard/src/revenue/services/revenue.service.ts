import { DB_CONNECTION } from '@libs/db/db-connection';
import { Database } from '@libs/db/types';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { GetTransactionsQueryDTO, WithdrawalActionDTO } from '../DTOs';
import { and, asc, count, desc, eq, SQL } from 'drizzle-orm';
import { transactions } from '@libs/db/schemas';
import { calcPagination } from '@libs/global/utils';
import { ApiResponse } from '@libs/global/types';
import { ApiStatus } from '@libs/global/enums';
import { InternalRevenueService } from '.';

@Injectable()
export class RevenueService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly internalRevenueService: InternalRevenueService,
  ) {}

  async getTransactions(query: GetTransactionsQueryDTO): ApiResponse {
    const where: SQL[] = [];
    let orderBy: SQL[] = [];

    if (query.type) where.push(eq(transactions.type, query.type));
    if (query.status) where.push(eq(transactions.status, query.status));
    if (query.userId) where.push(eq(transactions.userId, query.userId));

    if (!query.sort || query.sort === 'desc')
      orderBy.push(desc(transactions.createdAt));
    else if (query.sort === 'asc') orderBy.push(asc(transactions.createdAt));

    const { offset, limit, pagination } = await calcPagination(
      this.db
        .select({ total: count(transactions.id) })
        .from(transactions)
        .where(and(...where))
        .$dynamic(),
      query.page,
      query.limit,
    );

    const trxs = await this.db.query.transactions.findMany({
      where: and(...where),
      orderBy,
      offset,
      limit,
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'transaction retrieved successfully',
      data: {
        transactions: trxs,
        pagination,
      },
    };
  }

  async approveWithdrawal(id: number, data: WithdrawalActionDTO): ApiResponse {
    const request = await this.db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.status, 'pending')),
    });

    if (!request) throw new BadRequestException('Request does not exist');

    if (data.action === 'approve') {
      await this.internalRevenueService.updateTransaction({
        txDetails: {
          transactionId: request.id,
          statusToUpdate: 'succeeded',
        },
        balanceUpdate: {
          crossTransfer: undefined,
          mode: 'decrement',
          type: 'locked',
        },
      });
    } else if (data.action === 'reject') {
      await this.internalRevenueService.updateTransaction({
        txDetails: {
          transactionId: request.id,
          statusToUpdate: 'rejected',
        },
        balanceUpdate: {
          crossTransfer: 'locked-to-available',
        },
      });
    }
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'withdrawal updated successfully',
      data: {},
    };
  }
}
