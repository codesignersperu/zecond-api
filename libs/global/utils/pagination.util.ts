import { type PgSelect, type PgSelectBase } from 'drizzle-orm/pg-core';
import { safeParseInt } from './safe-parse-int.util';

export function pagination(
  page: string | number = '1',
  limit: string | number = '25',
) {
  const offset = (+page - 1) * +limit;
  return { limit: +limit, offset, page: +page };
}

export async function calcPagination(
  totalQuery: PgSelectBase<any, any, any, any, any, any, { total: number }[]>,
  page?: string | number,
  limit?: string | number,
) {
  page = safeParseInt((page || '1') as any);
  limit = safeParseInt((limit || '25') as any);

  const [{ total }] = await totalQuery;

  const totalPages = Math.ceil(total / limit);

  const offset = (+page - 1) * +limit;
  return {
    limit,
    offset,
    pagination: {
      total,
      page,
      limit,
      nextPage: page < totalPages,
      prevPage: page > 1,
    },
  };
}
