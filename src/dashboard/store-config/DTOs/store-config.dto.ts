import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const updateStoreConfig = z
  .object({
    auctionCommissionPercentage: z
      .string()
      .transform((v) => Number(v))
      .pipe(z.number().min(1).max(100)),
    deliveryFee: z
      .string()
      .transform((v) => Number(v))
      .pipe(z.number().min(1)),
    minimumWithdrawalAmount: z
      .string()
      .transform((v) => Number(v))
      .pipe(z.number().min(1)),
    maximumWithdrawalAmount: z
      .string()
      .transform((v) => Number(v))
      .pipe(z.number().min(1)),
    banners: z.string().transform((v): string[][] => JSON.parse(v)),
    mobileBanners: z.string().transform((v): string[][] => JSON.parse(v)),
  })
  .partial();

export class UpdateStoreConfigDTO extends createZodDto(updateStoreConfig) {}
