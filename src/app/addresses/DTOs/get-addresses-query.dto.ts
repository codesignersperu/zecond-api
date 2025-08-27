import { createZodDto } from 'nestjs-zod';
import { coerceBoolean, coerceNumber } from 'src/lib/schemas';
import { z } from 'zod';

const getAddressesQuerySchema = z
  .object({
    id: coerceNumber,
    primary: coerceBoolean,
  })
  .partial();

export class GetAddressesQueryDTO extends createZodDto(
  getAddressesQuerySchema,
) {}
