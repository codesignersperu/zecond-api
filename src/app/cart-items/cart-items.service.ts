import {
  BadRequestException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import { Database } from 'src/db/types';
import { bids, cartItems, products } from 'src/db/schemas';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { ApiResponse } from 'src/lib/types';
import type { CartItemInResponse } from './types';
import { ApiStatus } from 'src/lib/enums';
import { ProductsService } from 'src/app/products/products.service';

@Injectable()
export class CartItemsService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
  ) {}

  async add(userId: number, productId: number): ApiResponse {
    const item = await this.db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.userId, userId),
        eq(cartItems.productId, productId),
      ),
      columns: { id: true },
    });
    if (item) throw new BadRequestException('Product already in cart');

    // check if product is auction
    const [product] = await this.db
      .select({
        id: products.id,
        sellerId: products.sellerId,
        isAuction: products.isAuction,
      })
      .from(products)
      .where(eq(products.id, productId));

    if (!product) throw new BadRequestException("Product doesn't exist");

    if (product.sellerId === userId)
      throw new BadRequestException('Cannot add your own listings to cart');

    if (product.isAuction)
      throw new BadRequestException("Can't add auctions to cart");

    await this.db.insert(cartItems).values({
      userId,
      productId,
    });

    return {
      status: ApiStatus.SUCCESS,
      statusCode: HttpStatus.CREATED,
      message: 'Product added to cart',
      data: {},
    };
  }

  async findAll(userId: number): ApiResponse<CartItemInResponse[]> {
    const items = await this.db.query.cartItems.findMany({
      where: eq(cartItems.userId, userId),
      columns: { id: true, expirey: true },
      with: {
        product: {
          columns: {
            id: true,
            title: true,
            price: true,
            size: true,
            color: true,
            brand: true,
            isAuction: true,
          },
          with: {
            images: {
              columns: { id: true, url: true },
            },
            bids: {
              columns: { amount: true },
              limit: 1,
              orderBy: desc(bids.createdAt),
            },
          },
        },
      },
    });
    return {
      status: ApiStatus.SUCCESS,
      statusCode: HttpStatus.OK,
      message: 'Cart items retrieved successfully',
      data: items,
    };
  }

  async findOne(userId: number, id: number): ApiResponse<CartItemInResponse> {
    const item = await this.db.query.cartItems.findFirst({
      where: and(eq(cartItems.userId, userId), eq(cartItems.id, id)),
      columns: { id: true, expirey: true },
      with: {
        product: {
          columns: {
            id: true,
            title: true,
            price: true,
            size: true,
            color: true,
            brand: true,
            isAuction: true,
          },
          with: {
            images: {
              columns: { id: true, url: true },
            },
            bids: {
              limit: 1,
              orderBy: desc(bids.createdAt),
            },
          },
        },
      },
    });

    if (!item)
      throw new BadRequestException(`Cart item with id:${id} doesn't exit`);

    return {
      status: ApiStatus.SUCCESS,
      statusCode: HttpStatus.OK,
      message: 'Cart item retrieved successfully',
      data: item,
    };
  }

  async remove(userId: number, id: number): ApiResponse {
    const item = await this.db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, id),
          isNull(cartItems.expirey), // non-auction items
        ),
      )
      .returning({ id: cartItems.id });

    if (!item.length)
      throw new BadRequestException(`Cart item with id:${id} doesn't exit`);

    return {
      status: ApiStatus.SUCCESS,
      statusCode: HttpStatus.OK,
      message: 'Cart item removed successfully',
      data: {},
    };
  }

  async processCartExpirey(id) {
    const item = await this.db.query.cartItems.findFirst({
      where: eq(cartItems.id, id),
    });

    if (!item) return; // maybe user has checked out the auction

    // processing the product
    await this.productsService.processAuctionNotCheckedOut(item.productId);

    // removing item from cart
    await this.db.delete(cartItems).where(eq(cartItems.id, id));
  }
}
