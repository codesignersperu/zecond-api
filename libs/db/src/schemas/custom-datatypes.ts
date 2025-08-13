import { customType } from 'drizzle-orm/pg-core';

export const tsvector = customType<{ data: unknown }>({
  dataType() {
    return 'tsvector';
  },
});
