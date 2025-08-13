import { customTimestampwithTimezone } from './utils/custom-timestamp';
import { sql } from 'drizzle-orm';

export const timestamps = {
  createdAt: customTimestampwithTimezone()
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: customTimestampwithTimezone()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`)
    .notNull(),
};
