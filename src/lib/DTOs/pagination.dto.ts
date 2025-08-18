import { createZodDto } from 'nestjs-zod';
import { paginationSchema } from '../schemas';

export class PaginationDTO extends createZodDto(paginationSchema) {}
