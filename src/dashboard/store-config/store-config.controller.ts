import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import {
  SubscriptionPlansService,
  BrandsService,
  CategoriesService,
  SubcategoriesService,
  ColorsService,
  StoreConfigService,
} from './services';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/lib/config';
import { FileValidatorPipe } from 'src/lib/pipes';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { UpdateSubscriptionPlanDTO, UpdateStoreConfigDTO } from './DTOs';
import { User } from 'src/auth/decorators';
import { generateRandomHex } from 'src/lib/utils';
import { AuthGuard } from 'src/auth/guards';
import { UseGuards } from '@nestjs/common';
import { Role } from 'src/auth/enums';
import { Roles } from 'src/auth/decorators/roles-decorator';

@UseGuards(AuthGuard)
@Roles([Role.ADMIN])
@Controller('dashboard/store-config')
@UseInterceptors(CacheInterceptor)
@CacheTTL(0)
export class StoreConfigController {
  constructor(
    private readonly storeConfigService: StoreConfigService,
    private readonly brandsService: BrandsService,
    private readonly categoriesService: CategoriesService,
    private readonly subcategoriesService: SubcategoriesService,
    private readonly colorsService: ColorsService,
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  // Config
  @Get()
  get() {
    return this.storeConfigService.get();
  }

  @Patch()
  @UseInterceptors(
    FilesInterceptor(
      'images',
      100,
      multerOptions({ destination: './uploads/banners' }),
    ),
  )
  updateConfig(
    @User('id') adminId: string,
    @UploadedFiles(FileValidatorPipe(false))
    images: Array<Express.Multer.File>,
    @Body() data: UpdateStoreConfigDTO,
  ) {
    return this.storeConfigService.update(+adminId, data, images);
  }

  // Brands
  @Post('brands')
  @UseInterceptors(
    FileInterceptor(
      'image',
      multerOptions({ destination: './uploads/brands' }),
    ),
  )
  addBrand(
    @User('id') adminId: string,
    @UploadedFile(FileValidatorPipe(true)) image: Express.Multer.File,
    @Body() data: any,
  ) {
    if (!data.name) throw new BadRequestException('Name is required');
    return this.brandsService.add(+adminId, image, data.name);
  }

  @Get('brands')
  brandsFindAll() {
    return this.brandsService.findAll();
  }

  @Patch('brands')
  async updateBrand(@User('id') adminId: string, @Body() data: any) {
    if (!data.name) throw new BadRequestException('Brand Name is required');
    if (!data.newName)
      throw new BadRequestException('New Brand Name is required');
    return this.brandsService.update(+adminId, data.name, data.newName);
  }

  @Delete('brands')
  async deleteBrand(@User('id') adminId: string, @Body() data: any) {
    if (!data.name) throw new BadRequestException('Brand Name is required');
    return this.brandsService.delete(+adminId, data.name);
  }

  // Categories
  @Post('categories')
  addCategory(@User('id') adminId: string, @Body() data: any) {
    if (!data.name) throw new BadRequestException('Category Name is required');
    return this.categoriesService.add(+adminId, data.name);
  }

  @Get('categories-subcategories')
  categoriesFindAll() {
    return this.categoriesService.findAll();
  }

  @Patch('categories')
  updateCategory(@User('id') adminId: string, @Body() data: any) {
    if (!data.name) throw new BadRequestException('Category Name is required');
    if (!data.newName)
      throw new BadRequestException('Category Name is required');
    return this.categoriesService.update(+adminId, data.name, data.newName);
  }

  @Delete('categories')
  deleteCategory(@User('id') adminId: string, @Body() data: any) {
    if (!data.name) throw new BadRequestException('Category Name is required');
    return this.categoriesService.delete(+adminId, data.name);
  }

  // Subcategories
  @Post('subcategories')
  addSubcategory(@User('id') adminId: string, @Body() data: any) {
    if (!data.categoryId)
      throw new BadRequestException('Category Id is required');
    if (!data.name)
      throw new BadRequestException('Subcategory Name is required');
    if (!data.iconKey) throw new BadRequestException('Icon Key is required');
    return this.subcategoriesService.add(
      +adminId,
      data.categoryId,
      data.name,
      data.iconKey,
    );
  }

  @Patch('subcategories')
  updateSubcategory(@User('id') adminId: string, @Body() data: any) {
    if (!data.categoryId)
      throw new BadRequestException('Category Id is required');
    if (!data.name)
      throw new BadRequestException('Subcategory Name is required');
    if (!data.newName)
      throw new BadRequestException('New Subcategory Name is required');
    if (!data.iconKey) throw new BadRequestException('Icon Key is required');
    return this.subcategoriesService.update(
      +adminId,
      data.categoryId,
      data.name,
      data.newName,
      data.iconKey,
    );
  }

  @Delete('subcategories')
  deleteSubcategory(@User('id') adminId: string, @Body() data: any) {
    if (!data.categoryId)
      throw new BadRequestException('Category Id is required');
    if (!data.name)
      throw new BadRequestException('Subcategory Name is required');
    return this.subcategoriesService.delete(
      +adminId,
      data.categoryId,
      data.name,
    );
  }

  // Colors
  @Post('colors')
  addColor(@User('id') adminId: string, @Body() data: any) {
    if (!data.name) throw new BadRequestException('Name is required');
    if (!data.code) throw new BadRequestException('Code is required');
    return this.colorsService.add(+adminId, data.name, data.code);
  }

  @Get('colors')
  colorsFindAll() {
    return this.colorsService.findAll();
  }

  @Patch('colors')
  async updateColor(@User('id') adminId: string, @Body() data: any) {
    if (!data.name) throw new BadRequestException('Color Name is required');
    if (!data.newName)
      throw new BadRequestException('New Color Name is required');
    if (!data.code) throw new BadRequestException('Color Code is required');
    return this.colorsService.update(
      +adminId,
      data.name,
      data.newName,
      data.code,
    );
  }

  @Delete('colors')
  async deleteColor(@User('id') adminId: string, @Body() data: any) {
    if (!data.name) throw new BadRequestException('Color Name is required');
    return this.colorsService.delete(+adminId, data.name);
  }

  // Subscription Plans
  @Get('subscription-plans')
  subscriptionFindAll() {
    return this.subscriptionPlansService.findAll();
  }

  @Patch('subscription-plans')
  updateSubscriptionPlan(
    @User('id') adminId: string,
    @Body() data: UpdateSubscriptionPlanDTO,
  ) {
    return this.subscriptionPlansService.update(+adminId, data);
  }

  // DB Tables
  @Get('db-tables')
  @CacheTTL(60000) // 1 minute
  async getDbTables() {
    return this.storeConfigService.getDbTables();
  }

  @Get('prod-version')
  async getProdVersion() {
    return 'ba88fb68';
  }

  @Get('test')
  async test() {
    return generateRandomHex(8);
  }
}
