import { DB_CONNECTION } from 'src/db/db-connection';
import { adminAuditLogs, Order, orders, reviews } from 'src/db/schemas';
import type { Database } from 'src/db/types';
import { ApiStatus } from 'src/lib/enums';
import type { ApiResponse, Pagination } from 'src/lib/types';
import {
  calcPagination,
  diffObject,
  isObjEmpty,
  pagination,
} from 'src/lib/utils';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, getTableName, SQL } from 'drizzle-orm';
import { GetOrdersQueryDTO, UpdateOrderDto } from './DTOs';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
  ) {}

  async findAll(
    query: GetOrdersQueryDTO,
  ): ApiResponse<{ orders: Order[]; pagination: Pagination }> {
    const where: SQL[] = [];

    const { offset, limit, pagination } = await calcPagination(
      this.db
        .select({ total: count(orders.id) })
        .from(orders)
        .where(and(...where))
        .$dynamic(),
      query.page,
      query.limit,
    );

    const _orders = await this.db.query.orders.findMany({
      where: and(...where),
      offset,
      limit,
      orderBy: desc(orders.createdAt),
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Products retrieved successfully',
      data: {
        orders: _orders,
        pagination: pagination,
      },
    };
  }

  async update(adminId: number, id: number, data: UpdateOrderDto): ApiResponse {
    const [prev] = await this.db
      .select({
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        shippingCarrier: orders.shippingCarrier,
        shipmentTrackingUrl: orders.shipmentTrackingUrl,
        deliveredAt: orders.deliveredAt,
      })
      .from(orders)
      .where(eq(orders.id, id));

    if (!prev) throw new NotFoundException("Order Doesn't exist");

    let cleaned: Record<string, any> = {};

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    });

    if (isObjEmpty(cleaned)) throw new BadRequestException('No data to update');

    const updated = await this.db.transaction(async (tx) => {
      const [o] = await tx
        .update(orders)
        .set(cleaned)
        .where(eq(orders.id, id))
        .returning({
          id: orders.id,
          status: orders.status,
          paymentStatus: orders.paymentStatus,
          shippingCarrier: orders.shippingCarrier,
          shipmentTrackingUrl: orders.shipmentTrackingUrl,
          deliveredAt: orders.deliveredAt,
        });

      // Generating pending product reviews
      if (cleaned.status === 'completed') {
        await this.generateReviewsForOrder(o.id);
      }

      return o;
    });

    if (updated) {
      const { beforeValue, afterValue } = diffObject(prev, updated);

      if (!isObjEmpty(beforeValue))
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'UPDATE',
          tableName: getTableName(orders),
          recordId: updated.id.toString(),
          beforeValue,
          afterValue,
        });
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Order updated successfully',
      data: {},
    };
  }

  async generateReviewsForOrder(orderId: number) {
    const order = await this.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: {
        buyerId: true,
      },
      with: {
        orderItems: {
          with: {
            product: {
              columns: {
                id: true,
                sellerId: true,
              },
            },
          },
        },
      },
    });

    if (!order) return;

    for (let item of order.orderItems) {
      try {
        await this.db.insert(reviews).values({
          productId: item.product.id,
          sellerId: item.product.sellerId,
          userId: order.buyerId,
          orderId,
        });
      } catch {}
    }
  }
}
