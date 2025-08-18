import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiStatus } from 'src/lib/enums';
import { ZodValidationException } from 'nestjs-zod';
import { Database } from 'src/db/types';
import { errorLogs } from 'src/db/schemas';

@Catch() // Catches all exceptions, not just HttpException
export class GlobalExceptionFilter implements ExceptionFilter {
  db: Database;
  constructor(db: Database) {
    this.db = db;
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Zod validation error handling
    if (exception instanceof ZodValidationException) {
      const messages = exception
        .getZodError()
        .issues.map((issue) => issue.path[0] + ': ' + issue.message);

      response.status(status).json({
        statusCode: status,
        status: ApiStatus.ERROR,
        message: exception.message,
        data: { messages },
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // HttpException handling
    if (exception instanceof HttpException) {
      response.status(status).json({
        statusCode: status,
        status: ApiStatus.ERROR,
        message: exception.message,
        data: {},
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // All other (unexpected) errors

    console.log('Error: ', exception);

    let exc = exception as Error;

    try {
      let requestData = {};
      if (request) {
        requestData = {
          method: request.method,
          headers: request.headers,
          body: request.body,
          query: request.query,
          params: request.params,
        };
      }

      await this.db.insert(errorLogs).values({
        message: exc?.message,
        requestData,
        requestUrl: request?.url,
        stackTrace: exc?.stack,
      });
    } catch {
      console.error('Error logging the error');
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      status: ApiStatus.ERROR,
      message: 'An unexpected error occurred. Please try again later.',
      data: {},
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
