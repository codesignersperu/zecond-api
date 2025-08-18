import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BG_JOBS_TOKEN } from './constants';
import { AuctionJobs, CartItemJobs } from './enums';
import { ProductsService } from 'src/app/products/products.service';
import { AuctionJobData, CartItemJobData } from './types';
import { CartItemsService } from 'src/app/cart-items/cart-items.service';

@Processor(BG_JOBS_TOKEN)
export class JobsProcessor extends WorkerHost {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cartItemsService: CartItemsService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    switch (job.name) {
      // Auction Jobs
      case AuctionJobs.PROCESS_AUCTION_END:
        this.productsService.processAuctionEnd(
          (job.data as AuctionJobData).productId,
        );
        break;

      // Cart Jobs
      case CartItemJobs.PROCESS_ITEM_EXPIREY:
        this.cartItemsService.processCartExpirey(
          (job.data as CartItemJobData).id,
        );
        break;
    }
  }
}
