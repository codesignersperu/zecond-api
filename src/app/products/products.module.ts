import { forwardRef, Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { JobsQueueModule } from 'src/background-jobs/jobs.module';
import { ProductsGateway } from './products.gateway';
import { StoreConfigModule } from 'src/app/store-config/store-config.module';

@Module({
  imports: [forwardRef(() => JobsQueueModule), StoreConfigModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsGateway],
  exports: [ProductsService],
})
export class ProductsModule {}
