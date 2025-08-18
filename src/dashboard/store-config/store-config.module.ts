import { Module } from '@nestjs/common';
import {
  BrandsService,
  CategoriesService,
  SubcategoriesService,
  ColorsService,
  SubscriptionPlansService,
  StoreConfigService,
} from './services';
import { StoreConfigController } from './store-config.controller';

@Module({
  controllers: [StoreConfigController],
  providers: [
    StoreConfigService,
    BrandsService,
    CategoriesService,
    SubcategoriesService,
    ColorsService,
    SubscriptionPlansService,
  ],
  exports: [StoreConfigService],
})
export class StoreConfigModule {}
