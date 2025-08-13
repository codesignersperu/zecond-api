import { HttpStatus } from '@nestjs/common';
import { ApiStatus } from '@libs/global/enums';

export type ApiResponse<T = {}> = Promise<{
  statusCode: HttpStatus;
  status: ApiStatus;
  message: string;
  data: T;
}>;

export type Pagination = {
  page: number;
  limit: number;
  total: number;
};
