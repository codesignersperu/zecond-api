import { pgEnum } from 'drizzle-orm/pg-core';

export const zecondOrUser = pgEnum('zecond_or_user', ['zecond', 'user']);

export const recordStatusEnum = pgEnum('record_status', ['active', 'deleted']);
