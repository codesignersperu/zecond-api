import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  Post,
  UseInterceptors,
  UploadedFiles,
  Delete,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  GetProductsQueryDTO,
  UpdateProductDto,
} from './DTOs';
import { FileValidatorPipe, ParseAnythingPipe } from 'src/lib/pipes';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/lib/config';
import { User } from 'src/auth/decorators';
import { JwtPayload } from 'src/auth/types';
import { AuthGuard } from 'src/auth/guards';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles-decorator';
import { Role } from 'src/auth/enums';

@UseGuards(AuthGuard)
@Roles([Role.ADMIN])
@Controller('dashboard/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, multerOptions({ destination: './uploads' })),
  )
  create(
    @User() user: JwtPayload,
    @UploadedFiles(FileValidatorPipe(true))
    images: Array<Express.Multer.File>,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(+user.id, createProductDto, images);
  }

  @Get()
  findAll(@Query() query: GetProductsQueryDTO) {
    return this.productsService.getProducts(query);
  }

  @Get(':productId')
  getProduct(@Param('productId') productId: string) {
    return this.productsService.getProduct(+productId);
  }

  @Patch(':id')
  @UseInterceptors(
    FilesInterceptor('images', 10, multerOptions({ destination: './uploads' })),
  )
  update(
    @User() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFiles(FileValidatorPipe(false))
    images: Array<Express.Multer.File>,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(+user.id, +id, updateProductDto, images);
  }

  @Delete(':id')
  delete(@User('id') adminId: string, @Param('id') id: string) {
    return this.productsService.delete(+adminId, +id);
  }
}
