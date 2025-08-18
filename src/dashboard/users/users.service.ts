import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import type { Database } from 'src/db/types';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableName,
  ne,
  SQL,
  sql,
} from 'drizzle-orm';
import {
  adminAuditLogs,
  SubscriptionPlansIds,
  users,
  type UserSubscription,
  userSubscriptions,
} from 'src/db/schemas';
import type { ApiResponse, Pagination } from 'src/lib/types';
import type { UserInResponse } from './types';
import { ApiStatus } from 'src/lib/enums';
import {
  calcPagination,
  diffObject,
  isObjEmpty,
  pagination,
} from 'src/lib/utils';
import { FREE_PLAN_ID } from 'src/lib/constants';
import { GetSubscriptionsQueryDTO } from './DTOs/get-subscriptions-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
  ) {}

  async findAll(
    _page?: string,
    _limit?: string,
    query?: string,
  ): ApiResponse<{
    users: UserInResponse[];
    pagination: Pagination;
  }> {
    const { offset, limit, page } = pagination(_page, _limit);
    const where: SQL[] = [];
    let orderBy = asc(users.id);
    if (query) {
      where.push(sql`${users.textSearch} @@ plainto_tsquery(${query})`);
      orderBy = sql`ts_rank(${users.textSearch}, plainto_tsquery(${query})) DESC`;
    }

    const total = await this.db.$count(users);
    const _users = await this.db.query.users.findMany({
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        avatarUrl: true,
        isInfluencer: true,
      },
      where: and(...where),
      offset,
      limit,
      orderBy,
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched users successfully',
      data: {
        users: _users,
        pagination: {
          page,
          limit,
          total,
        },
      },
    };
  }

  async findOne(id: number) {
    const user = await this.db.query.users.findFirst({
      columns: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        avatarUrl: true,
        isInfluencer: true,
        phoneNumber: true,
      },
      with: {
        addresses: true,
        balance: {
          columns: {
            availableBalance: true,
            lockedBalance: true,
          },
        },
      },
      where: eq(users.id, id),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched user successfully',
      data: user,
    };
  }

  async getSubscriptions(query: GetSubscriptionsQueryDTO): ApiResponse<{
    subscriptions: UserSubscription[];
    pagination: Pagination;
  }> {
    const where: SQL[] = [
      eq(userSubscriptions.status, 'active'),
      ne(userSubscriptions.planId, FREE_PLAN_ID),
    ];

    if (query.plan) where.push(eq(userSubscriptions.planId, query.plan));
    if (query.userId) where.push(eq(userSubscriptions.userId, query.userId));

    const { offset, limit, pagination } = await calcPagination(
      this.db
        .select({ total: count(userSubscriptions.id) })
        .from(userSubscriptions)
        .$dynamic()
        .where(and(...where)),
      query.page,
      query.limit,
    );
    const subscriptions = await this.db.query.userSubscriptions.findMany({
      with: {
        user: {
          columns: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      where: and(...where),
      offset: offset,
      limit: limit,
      orderBy: desc(userSubscriptions.renewedAt),
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched subscriptions successfully',
      data: {
        subscriptions,
        pagination,
      },
    };
  }

  async getSubscriptionStatus(
    id: number,
  ): ApiResponse<UserSubscription | null> {
    const subscription = await this.db.query.userSubscriptions.findFirst({
      where: and(
        eq(userSubscriptions.userId, id),
        eq(userSubscriptions.status, 'active'),
      ),
      orderBy: desc(userSubscriptions.createdAt),
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched subscription status successfully',
      data: subscription || null,
    };
  }

  async toggleInfluencer(adminId: number, id: number): ApiResponse {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
      columns: { isInfluencer: true },
    });

    if (!user) throw new BadRequestException("User doesn't exist");

    let message = '';
    let v = true;

    if (user.isInfluencer) {
      v = false;
      message = 'User downgraded from influencer';
    } else {
      v = true;
      message = 'User upgraded to influencer';
    }

    const [updated] = await this.db
      .update(users)
      .set({ isInfluencer: v })
      .where(eq(users.id, id))
      .returning({ isInfluencer: users.isInfluencer });

    if (updated) {
      const { beforeValue, afterValue } = diffObject(
        { isInfluencer: user.isInfluencer },
        { isInfluencer: updated.isInfluencer },
      );
      if (!isObjEmpty(beforeValue))
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'UPDATE',
          tableName: getTableName(users),
          recordId: id.toString(),
          beforeValue,
          afterValue,
        });
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message,
      data: {},
    };
  }
}
