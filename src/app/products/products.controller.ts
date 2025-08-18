import {
  Controller,
  Post,
  UseGuards,
  Body,
  Get,
  Patch,
  Param,
  Query,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guards';
import { ProductsService } from './products.service';
import {
  UpdateProductDto,
  UpdateProductOpenAPI,
  BidDto,
  BidOpenAPI,
  GetProductsQueryDTO,
} from './DTOs';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { ActiveUserOnly, User } from 'src/auth/decorators';
import { PaginationDTO } from 'src/lib/DTOs';
import { ZodValidationPipe } from 'nestjs-zod';
import { z } from 'zod';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('bid')
  @UseGuards(AuthGuard)
  @ActiveUserOnly()
  @ApiOperation({
    summary: 'Lets users bid on auctins',
  })
  @ApiBody({
    schema: BidOpenAPI,
  })
  bidOnAuction(@User('id') userId: string, @Body() bidDto: BidDto) {
    return this.productsService.bidOnAuction(
      +userId,
      bidDto.productId,
      bidDto.amount,
    );
  }

  @Get('mine')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Returns products of a user',
  })
  getUsersProducts(
    @User('id') userId: string,
    @Query() pagination?: PaginationDTO,
  ) {
    return this.productsService.getUsersProducts(
      +userId,
      pagination?.page,
      pagination?.limit,
    );
  }

  @Get('bought')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Returns products bought by a user',
  })
  getUsersBoughtProducts(@User('id') userId: string) {
    return this.productsService.getUsersBoughtProducts(+userId);
  }

  @Get('my-offers')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Returns all the auctions in which the user is involved',
  })
  getMyOffers(
    @User('id') userId: string,
    @Query('type', new ZodValidationPipe(z.enum(['active', 'previous'])))
    type: 'active' | 'previous',
    @Query() pagination?: PaginationDTO,
  ) {
    return this.productsService.getMyOffers(+userId, type, pagination);
  }

  @Get('favorites')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Returns favorite products of a user',
  })
  getFavorites(
    @User('id') userId: string,
    @Query() pagination?: PaginationDTO,
  ) {
    return this.productsService.getFavorites(
      +userId,
      pagination?.page,
      pagination?.limit,
    );
  }

  @Get('favorite-ids')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Returns favorite product ids of a user',
  })
  getFavoriteIds(@User('id') userId: string) {
    return this.productsService.getFavoriteIds(+userId);
  }

  @Get(':productId')
  getProduct(
    @Param('productId') productId: string,
    @Query(
      'userIdForBid',
      new ZodValidationPipe(
        z
          .string()
          .regex(/^\d+$/, 'User id must be a number')
          .transform((v) => parseInt(v))
          .optional(),
      ),
    )
    userIdForBid?: number,
  ) {
    return this.productsService.getProduct(+productId);
  }

  @Get()
  getProducts(@Query() query: GetProductsQueryDTO) {
    return this.productsService.getProducts(query);
  }

  @Post('favorites/:productId')
  @ActiveUserOnly()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Lets users favorite/unfavorite a product',
  })
  favoriteteProduct(
    @User('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.productsService.favoriteProduct(+userId, +productId);
  }

  @Patch()
  @ActiveUserOnly()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Users can update their products',
  })
  @ApiBody({
    schema: UpdateProductOpenAPI,
  })
  updateProduct(
    @User('id') userId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(+userId, updateProductDto);
  }
}
