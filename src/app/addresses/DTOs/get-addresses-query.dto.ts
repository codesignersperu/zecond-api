import { createZodDto } from 'nestjs-zod';
import { coerceBoolean } from 'src/lib/schemas';
import { z } from 'zod';

const getAddressesQuerySchema = z
  .object({
    id: z.coerce.number(),
    primary: coerceBoolean,
  })
  .partial();

export class GetAddressesQueryDTO extends createZodDto(
  getAddressesQuerySchema,
) {}
