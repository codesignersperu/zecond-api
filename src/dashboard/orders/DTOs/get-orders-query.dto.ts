import { paginationSchema } from 'src/lib/schemas';
import { createZodDto } from 'nestjs-zod';

const getOrdersQuerySchema = paginationSchema;

export class GetOrdersQueryDTO extends createZodDto(getOrdersQuerySchema) {}
