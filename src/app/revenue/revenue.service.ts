import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DB_CONNECTION } from 'src/db/db-connection';
import { Database } from 'src/db/types';
import {
  balances,
  errorLogs,
  orders,
  transactions,
  withdrawalAccounts,
} from 'src/db/schemas';
import { and, asc, count, desc, eq, SQL, sql } from 'drizzle-orm';
import { InternalRevenueService } from 'src/dashboard/revenue/services';
import {
  AddWithdrawalAccountDTO,
  GetTransactionsQueryDTO,
  WithdrawalRequsetDTO,
} from './DTOs';
import { calcPagination, generateRandomHex } from 'src/lib/utils';
import { ApiStatus } from 'src/lib/enums';
import { ApiResponse } from 'src/lib/types';
import { StoreConfigService } from 'src/app/store-config/services';

@Injectable()
export class RevenueService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly internalRevenueService: InternalRevenueService,
    private readonly storeConfigService: StoreConfigService,
  ) {}

  async getTransactions(
    userId: number,
    query: GetTransactionsQueryDTO,
  ): ApiResponse {
    const where: SQL[] = [
      eq(transactions.for, 'user'),
      eq(transactions.userId, userId),
    ];
    let orderBy: SQL[] = [];

    if (query.type) where.push(eq(transactions.type, query.type));
    if (query.status) where.push(eq(transactions.status, query.status));

    if (!query.sort || query.sort === 'desc')
      orderBy.push(desc(transactions.createdAt));
    if (query.sort === 'asc') orderBy.push(asc(transactions.createdAt));

    const { offset, limit, pagination } = await calcPagination(
      this.db
        .select({ total: count(transactions.id) })
        .from(transactions)
        .where(and(...where))
        .$dynamic(),
      query.page,
      query.limit,
    );

    const _transactions = await this.db.query.transactions.findMany({
      where: and(...where),
      with: {
        account: {
          columns: { bank: true, accountNumber: true },
        },
        order: {
          columns: { id: true },
          with: { buyer: { columns: { firstName: true, lastName: true } } },
        },
      },
      orderBy,
      offset,
      limit,
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched transactions successfully',
      data: {
        transactions: _transactions,
        pagination,
      },
    };
  }

  async getBalance(userId: number): ApiResponse {
    const balance = await this.db.query.balances.findFirst({
      where: and(eq(balances.for, 'user'), eq(balances.userId, userId)),
      columns: { availableBalance: true, lockedBalance: true },
    });

    const { availableBalance, lockedBalance } = balance || {
      availableBalance: 0,
      lockedBalance: 0,
    };

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched balance successfully',
      data: { availableBalance, lockedBalance },
    };
  }

  // Withdrawal Requests/Accounts
  async createWithdrawalRequest(
    userId: number,
    data: WithdrawalRequsetDTO,
  ): ApiResponse {
    const account = await this.db.query.withdrawalAccounts.findFirst({
      where: and(
        eq(withdrawalAccounts.userId, userId),
        eq(withdrawalAccounts.status, 'active'),
        eq(withdrawalAccounts.id, data.accountId),
      ),
    });

    if (!account)
      throw new BadRequestException("Withdrawal Account doesn'nt exist");

    const storeConfig = await this.storeConfigService.getAppConfig();

    if (data.amount < storeConfig.minimumWithdrawalAmount)
      throw new BadRequestException(
        `Amount must be greater than or equal to $${storeConfig.minimumWithdrawalAmount}`,
      );

    if (data.amount > storeConfig.maximumWithdrawalAmount)
      throw new BadRequestException(
        `Amount must be less than or equal to $${storeConfig.maximumWithdrawalAmount}`,
      );

    try {
      await this.internalRevenueService.createTransaction({
        txDetails: {
          for: 'user',
          userId,
          type: 'withdrawal',
          amount: data.amount,
          accountId: data.accountId,
          statusToSet: 'pending',
        },
        type: 'available_to_locked',
      });
    } catch (e) {
      throw new BadRequestException('Operation failed: ' + e.message);
    }

    return {
      statusCode: HttpStatus.CREATED,
      status: ApiStatus.SUCCESS,
      message: 'Withdrawal request created successfully',
      data: {},
    };
  }

  async addWithdrawalAccount(
    userId: number,
    data: AddWithdrawalAccountDTO,
  ): ApiResponse {
    const alreadyExists = await this.db.query.withdrawalAccounts.findFirst({
      where: and(
        eq(withdrawalAccounts.status, 'active'),
        eq(withdrawalAccounts.userId, userId),
        eq(withdrawalAccounts.cciNumber, data.cciNumber),
      ),
      columns: {
        id: true,
      },
    });

    if (alreadyExists)
      throw new BadRequestException('Withdrawal account already exists');

    const primaryExists = await this.db.query.withdrawalAccounts.findFirst({
      where: and(
        eq(withdrawalAccounts.status, 'active'),
        eq(withdrawalAccounts.userId, userId),
        eq(withdrawalAccounts.isPrimary, true),
      ),
      columns: {
        id: true,
      },
    });

    await this.db.insert(withdrawalAccounts).values({
      userId,
      ...data,
      isPrimary: !primaryExists,
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Withdrawal account added successfully',
      data: {},
    };
  }

  async getWithdrawalAccounts(userId: number): ApiResponse {
    const accounts = await this.db.query.withdrawalAccounts.findMany({
      where: and(
        eq(withdrawalAccounts.status, 'active'),
        eq(withdrawalAccounts.userId, userId),
      ),
      columns: {
        id: true,
        bank: true,
        accountNumber: true,
        cciNumber: true,
        isPrimary: true,
      },
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched withdrawal accounts successfully',
      data: accounts,
    };
  }

  async deleteWithdrawalAccount(
    userId: number,
    accountId: number,
  ): ApiResponse {
    const account = await this.db.query.withdrawalAccounts.findFirst({
      where: and(
        eq(withdrawalAccounts.status, 'active'),
        eq(withdrawalAccounts.userId, userId),
        eq(withdrawalAccounts.id, accountId),
      ),
      columns: { id: true },
    });

    if (!account) throw new BadRequestException("Account Does'nt exist");

    // See if this account is in any withdrawal Requests
    // if its, then change its status to deleted, if not, just delete it

    const [{ requests }] = await this.db
      .select({ requests: count(transactions.id) })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'withdrawal'),
          eq(transactions.accountId, accountId),
        ),
      );

    await this.db.transaction(async (tx) => {
      if (requests > 0)
        await tx
          .update(withdrawalAccounts)
          .set({
            status: 'deleted',
            isPrimary: false,
            cciNumber: sql<string>`CONCAT(${withdrawalAccounts.cciNumber}, '-', 'deleted', '-', ${generateRandomHex(6)})`,
          })
          .where(eq(withdrawalAccounts.id, accountId));
      else
        await tx
          .delete(withdrawalAccounts)
          .where(eq(withdrawalAccounts.id, accountId));

      // if it was primary, make another account primary
      const newOne = await tx.query.withdrawalAccounts.findFirst({
        where: and(
          eq(withdrawalAccounts.status, 'active'),
          eq(withdrawalAccounts.userId, userId),
        ),
        orderBy: desc(withdrawalAccounts.createdAt),
      });

      if (newOne)
        await tx
          .update(withdrawalAccounts)
          .set({ isPrimary: true })
          .where(eq(withdrawalAccounts.id, newOne.id));
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Withdrawal account removed successfully',
      data: {},
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async clearSellersPendingClearanceTransactions() {
    // Rule: for a pending_clearance transaction to be completed, it's order must be marked as completed too.

    let trxs = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'order'),
          eq(transactions.status, 'pending_clearance'),
        ),
      )
      .leftJoin(
        orders,
        and(
          eq(orders.id, transactions.orderId),
          eq(orders.status, 'completed'),
        ),
      );

    for (let trx of trxs) {
      try {
        await this.internalRevenueService.updateTransaction({
          txDetails: { transactionId: trx.id, statusToUpdate: 'succeeded' },
          balanceUpdate: {
            crossTransfer: 'locked_to_available',
          },
        });
      } catch (e) {
        const error = e as Error;
        console.error();
        await this.db.insert(errorLogs).values({
          message: `Error updating 'pending_clearance' transaction: ${trx.id}: ${error.message}`,
          stackTrace: error.stack,
        });
      }
    }
  }
}
