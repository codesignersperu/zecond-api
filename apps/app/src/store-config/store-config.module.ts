import { Module } from '@nestjs/common';
import {
  StoreConfigService,
  SubscriptionPlansService,
  BrandsService,
  CategoriesService,
  AddressService,
  ColorsService,
} from './services';
import { StoreConfigController } from './store-config.controller';

@Module({
  controllers: [StoreConfigController],
  providers: [
    StoreConfigService,
    BrandsService,
    CategoriesService,
    ColorsService,
    AddressService,
    SubscriptionPlansService,
  ],
  exports: [SubscriptionPlansService, StoreConfigService],
})
export class StoreConfigModule {}
