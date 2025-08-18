import { DB_CONNECTION } from 'src/db/db-connection';
import { Database } from 'src/db/types';
import {
  products,
  favoriteProducts,
  bids,
  users,
  User,
  cartItems,
  productStatusEnum,
  productImages,
  orders,
  orderItems,
} from 'src/db/schemas';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GetProductsQueryDTO, UpdateProductDto } from './DTOs';
import {
  and,
  eq,
  count,
  ne,
  inArray,
  asc,
  desc,
  gt,
  sql,
  lt,
  max,
} from 'drizzle-orm';
import type { ApiResponse, Pagination } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';
import type { ProductInResponse, ProductsInResponse } from './types';
import { calcPagination, maskName } from 'src/lib/utils';
import { JobsQueueService } from 'src/background-jobs/jobs.service';
import { ProductsGateway } from './products.gateway';
import { BidsWsResponse } from './types/bids-response.type';
import * as dayjs from 'dayjs';
import { SubscriptionPlansService } from 'src/app/store-config/services';
import { PaginationDTO } from 'src/lib/DTOs';

@Injectable()
export class ProductsService {
  private readonly BID_COUNT_QUERY = sql<number>`(
    SELECT COUNT(*)::int
    FROM bids
    WHERE bids.product_id = products.id
  )`.as('bid_count');

  private myHighestBidQuery = (userId: number) =>
    sql<number>`(
    SELECT bids.amount
    FROM bids
    WHERE bids.product_id = products.id AND bids.bidder_id = ${userId}
    ORDER BY bids.created_at DESC
    LIMIT 1
  )`.as('my_highest_bid');

  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly jobsQueueService: JobsQueueService,
    private readonly productsGateway: ProductsGateway,
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  async bidOnAuction(
    userId: number,
    productId: number,
    amount: number,
  ): ApiResponse {
    const product = await this.db.query.products.findFirst({
      where: and(
        eq(products.id, productId),
        eq(products.isAuction, true),
        eq(products.status, 'live'),
        gt(products.endDate, new Date()),
      ),
      columns: {
        sellerId: true,
        price: true,
      },
    });

    if (!product)
      throw new BadRequestException(
        "Either product doesn't exist or is already sold",
      );

    if (product.sellerId === userId)
      throw new BadRequestException("Can't bid on your own listing");

    const highestBid = await this.db.query.bids.findFirst({
      where: eq(bids.productId, productId),
      columns: {
        amount: true,
      },
      orderBy: desc(bids.createdAt),
    });

    if (!highestBid) {
      if (amount < product.price)
        throw new BadRequestException(
          "Can't bid lower than the base price: " + product.price,
        );
    } else if (amount <= highestBid.amount) {
      throw new BadRequestException(
        'Offer must be greater than the highest bid: ' + highestBid.amount,
      );
    }

    const bid = await this.db
      .insert(bids)
      .values({
        productId: productId,
        bidderId: userId,
        amount,
      })
      .returning();

    const user = (await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        firstName: true,
        lastName: true,
      },
    })) as User;

    const broadcast: BidsWsResponse = {
      amount,
      at: bid[0].createdAt,
      bidderId: userId,
      bidderName: maskName(user.firstName, user.lastName),
    };

    this.productsGateway.sendNewBid(productId, broadcast);

    return {
      statusCode: HttpStatus.CREATED,
      status: ApiStatus.SUCCESS,
      message: 'Bid successfully',
      data: {},
    };
  }

  async processAuctionEnd(productId: number) {
    //  Steps
    //  check if there are any bids
    //  - if no bids, make the product draft
    //  - if bids,
    //      - make product sold,
    //      - add that product to the highest bidder's cart,
    //      - add cartItem expirey job
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.status, 'live')),
      columns: {
        id: true,
        title: true,
      },
      with: {
        bids: {
          limit: 1,
          orderBy: desc(bids.createdAt),
        },
        images: {
          columns: {
            url: true,
          },
          limit: 1,
        },
      },
    });

    if (!product) return;

    if (!product.bids) {
      await this.db
        .update(products)
        .set({ status: 'draft' })
        .where(eq(products.id, productId));

      return;
    }

    const cartItem = await this.db.transaction(async (tx) => {
      // marking the product auction ended
      await tx
        .update(products)
        .set({ status: 'auction_ended' })
        .where(eq(products.id, productId));

      // adding the product to user's cart
      const [item] = await tx
        .insert(cartItems)
        .values({
          productId: product.id,
          userId: product.bids[0].bidderId,
          expirey: dayjs().add(1, 'day').toDate(),
        })
        .returning({ id: cartItems.id, expirey: cartItems.expirey });

      return item;
    });

    // Adding item expirey job
    if (cartItem) {
      await this.jobsQueueService.addCartExpireyJob(
        cartItem.id,
        cartItem.expirey as Date,
      );
    }

    // Broadcasting winning
    this.productsGateway.sendAuctionWinner(product.id, {
      productId: product.id,
      amount: product.bids[0].amount,
      bidderId: product.bids[0].bidderId,
      productTitle: product.title,
      productImage: product.images[0].url,
    });
  }

  async processAuctionNotCheckedOut(productId: number) {
    // 1- making the product draft
    await this.db
      .update(products)
      .set({ status: 'draft' })
      .where(eq(products.id, productId));

    // 2- removing all the bids
    // await this.db.delete(bids).where(eq(bids.productId, productId))
    // maybe we should discuss it with the client
  }

  async getProducts({
    page,
    limit,
    sort,
    query,
    ids,
    userId,
    userIdForBid,
    excludeProduct,
    version,
    category,
    subcategory,
    size,
    color,
    brand,
    isAuction,
    isFeatured,
    isPremium,
    mode,
    statuses,
  }: GetProductsQueryDTO & {
    statuses?: Array<(typeof productStatusEnum.enumValues)[number]>;
  }): ApiResponse<{ products: ProductsInResponse[]; pagination: Pagination }> {
    const where: any = [];
    const orderBy: any = [];
    // -- filter --
    if (mode === 'checkout') {
      where.push(inArray(products.status, ['live', 'auction_ended']));
    } else if (statuses) {
      where.push(inArray(products.status, statuses));
    } else {
      where.push(eq(products.status, 'live'));
    }
    if (query) {
      where.push(sql`${products.textSearch} @@ plainto_tsquery(${query})`);
      orderBy.push(
        sql`ts_rank(${products.textSearch}, plainto_tsquery(${query})) DESC`,
      );
    }
    if (ids) where.push(inArray(products.id, ids));
    else if (userId && mode !== 'checkout')
      where.push(eq(products.sellerId, +userId));
    if (excludeProduct) where.push(ne(products.id, +excludeProduct));
    if (category) where.push(eq(products.category, category));
    if (subcategory) where.push(eq(products.subcategory, subcategory));
    if (size) where.push(eq(products.size, size));
    if (color) where.push(eq(products.color, color));
    if (brand) where.push(eq(products.brand, brand));
    if (typeof isAuction === 'boolean')
      where.push(eq(products.isAuction, isAuction));
    if (typeof isFeatured === 'boolean')
      where.push(eq(products.isFeatured, isFeatured));
    if (typeof isPremium === 'boolean')
      where.push(eq(products.isPremium, isPremium));

    // -- sort --

    if (!sort || sort === 'desc') orderBy.push(desc(products.createdAt));
    else if (sort === 'asc') orderBy.push(asc(products.createdAt));
    else if (sort === 'price-asc') orderBy.push(asc(products.price));
    else if (sort === 'price-desc') orderBy.push(desc(products.price));

    const { offset, pagination } = await calcPagination(
      this.db
        .select({ total: count(products.id) })
        .from(products)
        .where(and(...where))
        .$dynamic(),
      page,
      limit,
    );

    const _products = await this.db.query.products.findMany({
      where: and(...where),
      columns:
        version === 'full'
          ? undefined
          : {
              id: true,
              sellerId: true,
              title: true,
              price: true,
              isAuction: true,
              startDate: true,
              endDate: true,
              size: true,
              brand: true,
              brandImage: true,
              color: true,
              colorCode: true,
              condition: true,
              status: true,
            },
      with: {
        images: { columns: { id: true, url: true } },
        seller: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            avatarUrl: true,
            isInfluencer: true,
          },
        },
        bids: {
          columns: {
            amount: true,
            bidderId: true,
          },
          limit: 1,
          orderBy: desc(bids.createdAt),
        },
      },
      extras: {
        totalBids: this.BID_COUNT_QUERY,
        myHighestBid: this.myHighestBidQuery(userIdForBid || 0),
      },
      orderBy,
      offset,
      limit: pagination.limit,
    });

    if (mode === 'checkout') {
      if (!userId)
        throw new BadRequestException("User's Id is required in checkout mode");
      _products.forEach((product) => {
        if (product.seller.id === +userId)
          throw new BadRequestException(
            'You cannot checkout your own listings',
          );
      });
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Products retrieved successfully',
      data: {
        products: _products,
        pagination,
      },
    };
  }

  async getUsersProducts(
    userId: number,
    page?: number,
    limit?: number,
  ): ApiResponse<{ products: ProductsInResponse[]; pagination: Pagination }> {
    const productsRes = await this.getProducts({
      page,
      limit,
      sort: 'desc',
      userId: userId,
      statuses: ['auction_ended', 'draft', 'live', 'sold', 'pending_approval'],
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Products retrieved successfully',
      data: productsRes.data,
    };
  }

  async getUsersBoughtProducts(userId: number): ApiResponse {
    const _orders = await this.db.query.orders.findMany({
      where: and(eq(orders.buyerId, userId), eq(orders.status, 'completed')),
      columns: { id: true },
      with: {
        orderItems: {
          columns: { id: true },
          with: {
            product: {
              columns: {
                id: true,
                title: true,
                price: true,
                isAuction: true,
                startDate: true,
                endDate: true,
                size: true,
                color: true,
                brand: true,
                condition: true,
                status: true,
              },
              with: {
                seller: {
                  columns: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    username: true,
                    avatarUrl: true,
                    isInfluencer: true,
                  },
                },
                images: {
                  columns: { id: true, url: true },
                  limit: 1,
                  orderBy: asc(productImages.id),
                },
                bids: {
                  columns: {
                    amount: true,
                  },
                  limit: 1,
                  orderBy: desc(bids.createdAt),
                },
              },
            },
          },
          orderBy: desc(orderItems.id),
        },
      },
      orderBy: desc(orders.id),
    });

    let _products: any = [];
    for (let order of _orders) {
      _products.push(...order.orderItems.map((item) => item.product));
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Bought products retrieved successfully',
      data: _products,
    };
  }

  async getProduct(
    id: number,
    userIdForBid?: number,
  ): ApiResponse<ProductInResponse> {
    const productsRes = await this.getProducts({
      ids: [id],
      userIdForBid,
      version: 'full',
      statuses: ['draft', 'live', 'pending_approval'],
    });

    if (!productsRes.data.products.length) {
      throw new NotFoundException('Product not found');
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Product retrieved successfully',
      data: productsRes.data.products[0] as ProductInResponse,
    };
  }

  async updateProduct(
    userId: number,
    udpateProductDto: UpdateProductDto,
  ): ApiResponse {
    const id = udpateProductDto.id;
    //@ts-ignore
    delete udpateProductDto.id;

    await this.db
      .update(products)
      .set(udpateProductDto)
      .where(and(eq(products.sellerId, userId), eq(products.id, id)));

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Product updated successfully',
      data: {},
    };
  }

  async getMyOffers(
    userId: number,
    type: 'active' | 'previous',
    pagination?: PaginationDTO,
  ): ApiResponse {
    // Extracting the product ids in which the user has placed a bid
    let _ids = await this.db
      .selectDistinct({ id: products.id, latestBidAt: max(bids.createdAt) })
      .from(bids)
      .innerJoin(
        products,
        and(
          eq(bids.productId, products.id),
          type === 'active'
            ? gt(products.endDate, new Date())
            : lt(products.endDate, new Date()),
        ),
      )
      .where(eq(bids.bidderId, userId))
      .groupBy(products.id)
      .orderBy(desc(max(bids.createdAt)));

    let ids = _ids.map((id) => id.id);

    const productsRes = await this.getProducts({
      ids,
      userIdForBid: userId,
      statuses: ['live', 'auction_ended'],
      ...pagination,
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'My offers retrieved successfully',
      data: productsRes.data,
    };
  }

  async favoriteProduct(userId: number, productId: number) {
    const product = await this.db.query.favoriteProducts.findFirst({
      where: and(
        eq(favoriteProducts.userId, userId),
        eq(favoriteProducts.productId, productId),
      ),
    });

    if (!product) {
      // Add product to favorites
      await this.db.insert(favoriteProducts).values({
        userId,
        productId,
      });

      return {
        statusCode: HttpStatus.OK,
        status: ApiStatus.SUCCESS,
        message: 'Product added to favorites',
        data: {},
      };
    } else {
      // remove from favorites
      await this.db
        .delete(favoriteProducts)
        .where(
          and(
            eq(favoriteProducts.userId, userId),
            eq(favoriteProducts.productId, productId),
          ),
        );
      return {
        statusCode: HttpStatus.OK,
        status: ApiStatus.SUCCESS,
        message: 'Product removed from favorites',
        data: {},
      };
    }
  }

  async getFavoriteIds(userId: number): ApiResponse<number[]> {
    const userFavorites = await this.db.query.favoriteProducts.findMany({
      where: eq(favoriteProducts.userId, userId),
      columns: { productId: true },
    });
    let ids = userFavorites.map((v) => v.productId);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Favorite Product Ids retrieved successfully',
      data: ids,
    };
  }

  async getFavorites(
    userId: number,
    page?: number,
    limit?: number,
  ): ApiResponse<{ products: ProductsInResponse[]; pagination: Pagination }> {
    const userFavorites = await this.db
      .select({ id: favoriteProducts.productId })
      .from(favoriteProducts)
      .where(eq(favoriteProducts.userId, userId));

    let products = await this.getProducts({
      page,
      limit,
      sort: 'desc',
      ids: userFavorites.map((v) => v.id),
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Favorite Products retrieved successfully',
      data: products.data,
    };
  }
}
