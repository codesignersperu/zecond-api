import type { Database } from '../types';
import { balances } from '../schemas';
import { eq } from 'drizzle-orm';

export async function seedPlatformBalance(db: Database) {
  try {
    const existing = await db
      .select()
      .from(balances)
      .where(eq(balances.for, 'platform'));

    if (!existing.length) await db.insert(balances).values({ for: 'platform' });
  } catch (e) {
    console.log('🔴 Error seeding platform balance');
    console.log(e);
    console.log('');
  }
}
