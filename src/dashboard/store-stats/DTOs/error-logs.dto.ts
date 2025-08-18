import { paginationSchema } from 'src/lib/schemas';
import { createZodDto } from 'nestjs-zod';

const errorLogsQuerySchema = paginationSchema;

export class ErrorLogsQueryDTO extends createZodDto(errorLogsQuerySchema) {}
