import { DB_CONNECTION } from 'src/db/db-connection';
import {
  adminAuditLogs,
  type SubscriptionPlan,
  subscriptionPlans,
  userSubscriptions,
} from 'src/db/schemas';
import { Database } from 'src/db/types';
import { ApiStatus } from 'src/lib/enums';
import { ApiResponse } from 'src/lib/types';
import {
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateSubscriptionPlanDTO } from '../DTOs';
import { eq, getTableName, inArray, sql } from 'drizzle-orm';
import { type Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { diffObject, isObjEmpty } from 'src/lib/utils';
import { SUBSCRIPTION_PLANS_APP_CACHE_KEY } from 'src/app/store-config/constants';

@Injectable()
export class SubscriptionPlansService {
  private readonly API_CACHE_KEYS = [
    '/v1/store-config/subscription-plans',
    SUBSCRIPTION_PLANS_APP_CACHE_KEY,
    '/v1/store-config/subscription-plans',
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

  async findAll(): ApiResponse<SubscriptionPlan[]> {
    const plans = await this.db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.id);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'plans for dashboard retrieved successfully',
      data: plans,
    };
  }

  async update(adminId: number, body: UpdateSubscriptionPlanDTO): ApiResponse {
    const id = body.id;
    // @ts-ignore
    delete body.id;

    const prevPlan = await this.db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, id),
    });

    if (!prevPlan) throw new NotFoundException('Plan not found');

    const updatedPlan = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(subscriptionPlans)
        .set(body)
        .where(eq(subscriptionPlans.id, id))
        .returning();

      // Update Agenda
      if (updated) {
        // 1: if the listing limit is increased, add the difference to users's current active & paused subscription records
        //    if its decreased, then no effect
        if (updated.listingsLimit > prevPlan.listingsLimit) {
          const difference = updated.listingsLimit - prevPlan.listingsLimit;

          await tx
            .update(userSubscriptions)
            .set({
              // need to do this:
              listingsRemaining: sql`${userSubscriptions.listingsRemaining} + ${difference}`,
            })
            .where(inArray(userSubscriptions.status, ['active', 'paused']));
        }
      }

      return updated;
    });

    await this.clearCache();

    if (updatedPlan) {
      const { beforeValue, afterValue } = diffObject(prevPlan, updatedPlan);
      if (!isObjEmpty(beforeValue))
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'UPDATE',
          tableName: getTableName(subscriptionPlans),
          recordId: updatedPlan.id.toString(),
          beforeValue,
          afterValue,
        });
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'plan updated successfully',
      data: {},
    };
  }
}
