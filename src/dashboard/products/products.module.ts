import { forwardRef, Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { JobsQueueModule } from 'src/background-jobs/jobs.module';

@Module({
  imports: [forwardRef(() => JobsQueueModule)],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
