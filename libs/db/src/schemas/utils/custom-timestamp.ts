import { type SQL } from 'drizzle-orm';
import { customType, type Precision } from 'drizzle-orm/pg-core';

/**
 * `customTimestampwithTimezone` to help with TypeError: value.toISOString is not a function when using sql`CUSTOM_TIMESTAMP` in $onUpdate
 */
export const customTimestampwithTimezone = customType<{
  data: Date;
  driverData: string;
  config: { precision?: Precision };
}>({
  dataType(config) {
    const precision =
      config?.precision === undefined ? '' : ` (${config.precision})`;
    return `timestamp${precision} with time zone`;
  },
  fromDriver(value: string) {
    return new Date(value);
  },
  toDriver(value: Date | SQL) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
});
