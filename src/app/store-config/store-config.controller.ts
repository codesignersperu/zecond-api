import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  SubscriptionPlansService,
  BrandsService,
  CategoriesService,
  AddressService,
  ColorsService,
  StoreConfigService,
} from './services';
import { ApiOperation } from '@nestjs/swagger';

@Controller('store-config')
@UseInterceptors(CacheInterceptor)
@CacheTTL(0)
export class StoreConfigController {
  constructor(
    private readonly storeConfigService: StoreConfigService,
    private readonly brandsService: BrandsService,
    private readonly categoriesService: CategoriesService,
    private readonly addressService: AddressService,
    private readonly colorsService: ColorsService,
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  // Config
  @Get()
  @ApiOperation({
    summary: 'Returns the store configuration',
  })
  get() {
    return this.storeConfigService.get();
  }

  // Brands
  @Get('brands')
  @ApiOperation({
    summary: 'Returns a List of all the brands listed on ZECOND',
  })
  brandsFindAll() {
    return this.brandsService.findAll();
  }

  @Get('brands/:id')
  @ApiOperation({
    summary: 'Returns a brand by id',
  })
  brandsFindOne(@Param('id') id: string) {
    return this.brandsService.findOne(+id);
  }

  // Categories
  @Get('categories-subcategories')
  @ApiOperation({
    summary:
      'Returns a List of all the product categories with their respective IDs listed on ZECOND',
  })
  categoriesFindAll() {
    return this.categoriesService.findAll();
  }

  // Colors
  @Get('colors')
  @ApiOperation({
    summary: 'Returns a List of colors with codes and names',
  })
  colorsFindAll() {
    return this.colorsService.findAll();
  }

  // Subscription Plans
  @Get('subscription-plans')
  @ApiOperation({
    summary: 'Returns all subscription plans that the application offers',
  })
  subscriptionFindAll() {
    return this.subscriptionPlansService.findAll();
  }

  // Address Data
  @Get('address/post-code/:code')
  @ApiOperation({
    summary: 'Returns address info of a post code in Mexico',
  })
  addressPostcode(@Param('code') code: string) {
    return this.addressService.postcode(code);
  }

  @Get('address/states')
  @ApiOperation({
    summary: 'Returns all states in Mexico',
  })
  addressStates() {
    return this.addressService.states();
  }

  @Get('address/municipalities')
  @ApiOperation({
    summary: 'Returns all municipalities of a state in Mexico',
  })
  addressMunicipalities(@Query('state') state: string) {
    return this.addressService.municipalities(state);
  }

  @Get('address/cities')
  @ApiOperation({
    summary: 'Returns all cities of a municipality in Mexico',
  })
  addressCities(
    @Query('state') state: string,
    @Query('municipality') municipality: string,
  ) {
    return this.addressService.cities(state, municipality);
  }

  @Get('address/neighborhoods')
  @ApiOperation({
    summary: 'Returns all neighborhoods of a city in Mexico',
  })
  addressNeighborhoods(
    @Query('state') state: string,
    @Query('municipality') municipality: string,
    @Query('city') city: string,
  ) {
    return this.addressService.neighborhoods(state, municipality, city);
  }
}
