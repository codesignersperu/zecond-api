import { pgEnum } from 'drizzle-orm/pg-core';

export const platformOrUser = pgEnum('platform_or_user', ['platform', 'user']);

export const recordStatusEnum = pgEnum('record_status', ['active', 'deleted']);
