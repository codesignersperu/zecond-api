import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { BG_JOBS_TOKEN } from './constants';
import { Queue } from 'bullmq';
import { AuctionJobs, CartItemJobs } from './enums';
import { CartItemJobData, type AuctionJobData } from './types';
import * as dayjs from 'dayjs';

@Injectable()
export class JobsQueueService {
  private AUCTION_JOB_ID_PREFIX = 'auction_';
  private CART_JOB_ID_PREFIX = 'cart_';

  constructor(
    @InjectQueue(BG_JOBS_TOKEN)
    private readonly jobsQueue: Queue,
  ) {}

  /**
   * `removeAuctionEndJob` removes an auction from the background jobs queue.
   * @param productId
   */
  async removeAuctionEndJob(productId: number) {
    await this.jobsQueue.remove(this.AUCTION_JOB_ID_PREFIX + productId);
  }

  /**
   * `addAuctionEndJob` adds an auction to the background jobs queue to process its ending.
   * if the auction is already present, it removes it from the queue & adds it again.
   * @param productId
   * @param endDate
   */
  async addAuctionEndJob(productId: number, endDate: Date | string) {
    // removing existing auction if exists
    await this.removeAuctionEndJob(productId);

    const jobData: AuctionJobData = { productId };

    await this.jobsQueue.add(AuctionJobs.PROCESS_AUCTION_END, jobData, {
      delay: dayjs(endDate).valueOf() - Date.now(),
      jobId: this.AUCTION_JOB_ID_PREFIX + productId,
      removeOnComplete: true,
    });
  }

  /**
   * `addCartExpireyJob` adds an cart item to the background jobs queue to process its expirey.
   * if the job is already present, it removes it from the queue & adds it again.
   * @param productId
   * @param endDate
   */
  async addCartExpireyJob(id: number, expirey: Date | string) {
    // removing existing job if exists
    await this.jobsQueue.remove(this.CART_JOB_ID_PREFIX + id);

    const jobData: CartItemJobData = { id };

    await this.jobsQueue.add(CartItemJobs.PROCESS_ITEM_EXPIREY, jobData, {
      delay: dayjs(expirey).valueOf() - Date.now(),
      jobId: this.CART_JOB_ID_PREFIX + id,
      removeOnComplete: true,
    });
  }
}
