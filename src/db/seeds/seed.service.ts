import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DB_CONNECTION } from '../db-connection';
import { Database } from '../types';
import { seedAdmins } from './admins';
import { seedConfig } from './store-config';
import { seedSubscriptionPlans } from './subscription-plans';
import { seedPlatformBalance } from './platform-balance';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async onApplicationBootstrap() {
    await seedAdmins(this.db);
    await seedConfig(this.db);
    await seedSubscriptionPlans(this.db);
    await seedPlatformBalance(this.db);
  }
}
