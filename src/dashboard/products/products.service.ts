import {
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateProductDto,
  GetProductsQueryDTO,
  UpdateProductDto,
} from './DTOs';
import { DB_CONNECTION } from 'src/db/db-connection';
import { Database } from 'src/db/types';
import type { ApiResponse, Pagination } from 'src/lib/types';
import type { ProductResponse } from './type';
import {
  calcPagination,
  deleteFile,
  diffObject,
  isObjEmpty,
  pagination,
} from 'src/lib/utils';
import {
  adminAuditLogs,
  bids,
  type ProductImage,
  productImages,
  products,
  productStatusEnum,
  userSubscriptions,
} from 'src/db/schemas';
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableName,
  notInArray,
} from 'drizzle-orm';
import { ApiStatus } from 'src/lib/enums';
import { JobsQueueService } from 'src/background-jobs/jobs.service';
import * as path from 'path';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly jobsQueueService: JobsQueueService,
  ) {}

  async create(
    adminId: number,
    createProductDto: CreateProductDto,
    images: Array<Express.Multer.File>,
  ): ApiResponse {
    const sellerSubscription = await this.db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, createProductDto.sellerId),
      columns: {
        id: true,
        listingsRemaining: true,
      },
    });

    const product = await this.db.transaction(async (tx) => {
      // saving the product
      const [savedProduct] = await tx
        .insert(products)
        .values({
          ...createProductDto,
        })
        .returning();

      // saving the images
      await tx.insert(productImages).values(
        images.map((image) => ({
          productId: savedProduct.id,
          url: '/' + image.path,
        })),
      );

      // updating users subscription stats
      if (sellerSubscription && sellerSubscription.listingsRemaining > 0) {
        await tx
          .update(userSubscriptions)
          .set({ listingsRemaining: sellerSubscription.listingsRemaining - 1 });
      }

      if (savedProduct.isAuction) {
        // adding product to auctions queue
        await this.jobsQueueService.addAuctionEndJob(
          savedProduct.id,
          savedProduct.endDate as any as string,
        );
      }

      return savedProduct;
    });

    if (product) {
      await this.db.insert(adminAuditLogs).values({
        adminId,
        operation: 'CREATE',
        tableName: getTableName(products),
        recordId: product.id.toString(),
        beforeValue: {},
        afterValue: product,
      });
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Product created successfully',
      data: {},
    };
  }

  async getProducts(
    query: GetProductsQueryDTO,
  ): ApiResponse<{ products: any[]; pagination: Pagination }> {
    const {
      page = 1,
      limit: _limit = 10,
      sort = 'desc',
      isAuction,
      isFeatured,
      isPremium,
      userId,
      status,
    } = query;

    // -- filter --
    const where: any = [];

    if (typeof isAuction === 'boolean')
      where.push(eq(products.isAuction, isAuction));
    if (typeof isFeatured === 'boolean')
      where.push(eq(products.isFeatured, isFeatured));
    if (typeof isPremium === 'boolean')
      where.push(eq(products.isPremium, isPremium));
    if (userId) where.push(eq(products.sellerId, userId));
    if (status) where.push(eq(products.status, status));

    // -- sort --
    const orderBy: any = [];
    if (sort) {
      if (sort === 'asc') orderBy.push(asc(products.createdAt));
      if (sort === 'desc') orderBy.push(desc(products.createdAt));
    }

    const { offset, limit, pagination } = await calcPagination(
      this.db
        .select({ total: count(products.id) })
        .from(products)
        .where(and(...where))
        .$dynamic(),
      page,
      _limit,
    );

    const _products = await this.db.query.products.findMany({
      where: and(...where),
      with: {
        seller: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            avatarUrl: true,
            isInfluencer: true,
          },
        },
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
      orderBy,
      offset,
      limit,
    });

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

  async getProduct(productId: number): ApiResponse {
    const product = await this.db.query.products.findFirst({
      where: eq(products.id, productId),
      with: {
        images: { columns: { id: true, url: true } },
        seller: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            email: true,
            avatarUrl: true,
            isInfluencer: true,
          },
        },
        bids: {
          columns: {
            amount: true,
          },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Product fethec successfully',
      data: product,
    };
  }

  async update(
    adminId: number,
    id: number,
    udpateProductDto: UpdateProductDto,
    images: Array<Express.Multer.File>,
  ) {
    let imageUpdate = !!udpateProductDto.sortedImages;
    let imagesToDel: any[] = [];

    const updatedProduct = await this.db.transaction(async (tx) => {
      // saving the product
      const [updatedProduct] = await tx
        .update(products)
        .set(udpateProductDto)
        .where(eq(products.id, id))
        .returning();

      if (!imageUpdate) return updatedProduct;

      const imagesToSpare: string[] = [];
      const updatedImages: ProductImage[] = udpateProductDto.sortedImages.map(
        (v) => {
          if (v.url) {
            imagesToSpare.push(v.url);
            return { productId: id, url: v.url };
          }
          {
            return {
              productId: id,
              url:
                '/' + images.find((q) => q.originalname === v.filename)?.path,
            };
          }
        },
      );

      imagesToDel = await this.db
        .select({ url: productImages.url })
        .from(productImages)
        .where(
          and(
            eq(productImages.productId, id),
            notInArray(productImages.url, imagesToSpare),
          ),
        );
      imagesToDel = imagesToDel.map((v) => v.url);

      // deleting old images
      await tx.delete(productImages).where(eq(productImages.productId, id));

      // saving new images
      await tx.insert(productImages).values(updatedImages);
    });

    // Deleting the discarded image files
    imagesToDel.forEach(async (url) => {
      await deleteFile(path.join(process.cwd(), url));
    });

    // updating the auction queue job
    if (updatedProduct && updatedProduct.isAuction) {
      if (udpateProductDto.endDate && udpateProductDto.status === 'live') {
        // adding product to auctions queue
        await this.jobsQueueService.addAuctionEndJob(
          updatedProduct.id,
          updatedProduct.endDate as any as string,
        );
      } else if (udpateProductDto.status !== 'live') {
        await this.jobsQueueService.removeAuctionEndJob(updatedProduct.id);
      }
    }
    if (updatedProduct) {
      const [prev] = await this.db
        .select()
        .from(products)
        .where(eq(products.id, updatedProduct.id));
      // diffing the old and new product data
      const { beforeValue, afterValue } = diffObject(prev, updatedProduct);

      if (!isObjEmpty(beforeValue))
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'UPDATE',
          tableName: getTableName(products),
          recordId: updatedProduct.id.toString(),
          beforeValue,
          afterValue,
        });
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Product updated successfully',
      data: {},
    };
  }

  async delete(adminId: number, id: number): ApiResponse {
    await this.db.transaction(async (tx) => {
      const [prev] = await tx
        .delete(products)
        .where(eq(products.id, id))
        .returning();

      if (!prev) throw new NotFoundException('Product not found');

      await tx.insert(adminAuditLogs).values({
        adminId,
        operation: 'DELETE',
        tableName: getTableName(products),
        recordId: prev.id.toString(),
        beforeValue: prev,
        afterValue: {},
      });
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Product deleted successfully',
      data: {},
    };
  }
}
