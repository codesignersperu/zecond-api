import { z } from 'zod';
export const coerceBoolean = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export const coerceNumber = z
  .string()
  .transform((raw) => {
    const s = raw.trim();
    // allows optional sign, integers, and decimals like ".5" or "1."
    const isNumeric = /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s);
    return isNumeric ? parseFloat(s) : undefined;
  })
  .pipe(z.number().optional());

export * from './pagination.schema';
