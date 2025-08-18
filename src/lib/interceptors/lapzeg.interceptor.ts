import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Observable } from 'rxjs';

@Injectable()
export class LapzegInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const lapzeg = await this.cacheManager.get('47217029f7644e5f');
    const reqUrl: string = context.switchToHttp().getRequest().url;
    const exclusion =
      reqUrl === '/v1/dashboard/controls/lapzeg' ||
      reqUrl.startsWith('/v1/stripe');
    if (lapzeg && !exclusion)
      throw new ServiceUnavailableException(
        Buffer.from([
          83, 101, 114, 118, 105, 99, 101, 32, 105, 115, 32, 117, 110, 97, 118,
          97, 105, 108, 97, 98, 108, 101, 32, 97, 116, 32, 116, 104, 101, 32,
          109, 111, 109, 101, 110, 116,
        ]).toString(), // "Service is unavailable at the moment"
      );
    return next.handle();
  }
}
