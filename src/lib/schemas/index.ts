import { z } from 'zod';
export const coerceBoolean = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export * from './pagination.schema';
