import { paginationSchema } from '@libs/global/schemas';
import { createZodDto } from 'nestjs-zod';

const errorLogsQuerySchema = paginationSchema;

export class ErrorLogsQueryDTO extends createZodDto(errorLogsQuerySchema) {}
