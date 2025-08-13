import { forwardRef, Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { JobsQueueModule } from '@libs/background-jobs/jobs.module';
import { ProductsGateway } from './products.gateway';
import { StoreConfigModule } from '@app/store-config/store-config.module';

@Module({
  imports: [forwardRef(() => JobsQueueModule), StoreConfigModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsGateway],
  exports: [ProductsService],
})
export class ProductsModule {}
