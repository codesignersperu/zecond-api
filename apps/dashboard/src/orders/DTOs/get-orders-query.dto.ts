import { paginationSchema } from '@libs/global/schemas';
import { createZodDto } from 'nestjs-zod';

const getOrdersQuerySchema = paginationSchema;

export class GetOrdersQueryDTO extends createZodDto(getOrdersQuerySchema) {}
