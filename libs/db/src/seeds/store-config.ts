import type { Database } from '../types';
import { type StoreConfigInsert, storeConfig } from '../schemas';
import { eq } from 'drizzle-orm';

const configSeed: StoreConfigInsert = {
  id: 1,
  auctionCommissionPercentage: 20,
  minimumWithdrawalAmount: 100,
  maximumWithdrawalAmount: 100,
  deliveryFee: 50,
  banners: [],
};

export async function seedConfig(db: Database) {
  try {
    let [storeConfigExists] = await db
      .select({ id: storeConfig.id })
      .from(storeConfig)
      .where(eq(storeConfig.id, 1));
    if (!storeConfigExists) {
      await db.insert(storeConfig).values(configSeed);
    }
  } catch (e) {
    console.log('🔴 Error seeding store config');
    console.log(e);
    console.log('');
  }
}
