import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { BG_JOBS_TOKEN } from './constants';
import { JobsProcessor } from './jobs.processor';
import { JobsQueueService } from './jobs.service';
import { ProductsModule } from '@app/products/products.module';
import { AppConfigModule } from '@libs/config';
import { CartItemsModule } from '@app/cart-items/cart-items.module';

@Module({
  imports: [
    AppConfigModule,
    BullModule.registerQueue({ name: BG_JOBS_TOKEN }),
    forwardRef(() => ProductsModule),
    CartItemsModule,
  ],
  providers: [JobsProcessor, JobsQueueService],
  exports: [JobsQueueService],
})
export class JobsQueueModule {}
