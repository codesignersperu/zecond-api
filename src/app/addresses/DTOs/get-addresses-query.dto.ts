import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const getAddressesQuerySchema = z
  .object({
    id: z.coerce.number(),
    primary: z.coerce.boolean(),
  })
  .partial();

export class GetAddressesQueryDTO extends createZodDto(
  getAddressesQuerySchema,
) {}
