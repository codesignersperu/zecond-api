import { orders } from '@libs/db/schemas';
import { createInsertSchema } from 'drizzle-zod';
import { createZodDto } from 'nestjs-zod';

const updateOrderSchema = createInsertSchema(orders)
  .pick({
    status: true,
    paymentStatus: true,
    shippingCarrier: true,
    shipmentTrackingUrl: true,
    deliveredAt: true,
  })
  .partial();

export class UpdateOrderDto extends createZodDto(updateOrderSchema) {}
