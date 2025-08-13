import { createZodDto, zodToOpenAPI } from 'nestjs-zod';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { z } from 'zod';

const bidSchema = z.object({
  amount: z.number(),
  productId: z.number(),
});

export class BidDto extends createZodDto(bidSchema) {}

export const BidOpenAPI: SchemaObject = zodToOpenAPI(bidSchema);
