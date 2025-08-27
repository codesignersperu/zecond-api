import { z } from 'zod';
import { coerceNumber } from '.';

export const paginationSchema = z.object({
  page: coerceNumber.pipe(z.number().min(1).default(1)).optional(),
  limit: coerceNumber.pipe(z.number().min(1).max(100).default(10)).optional(),
});
