import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const withdrawalActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export class WithdrawalActionDTO extends createZodDto(withdrawalActionSchema) {}
