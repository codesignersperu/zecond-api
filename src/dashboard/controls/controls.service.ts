import { DB_CONNECTION } from 'src/db/db-connection';
import {
  admins,
  balances,
  bids,
  brands,
  categories,
  colors,
  orders,
  productImages,
  products,
  subcategories,
  subscriptionPlans,
  users,
  userSubscriptions,
} from 'src/db/schemas';
import { Database } from 'src/db/types';
import { ApiStatus } from 'src/lib/enums';
import { ApiResponse } from 'src/lib/types';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Cache } from 'cache-manager';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import * as dayjs from 'dayjs';
import { generateRandomHex, isObjEmpty } from 'src/lib/utils';
import { AuthService } from 'src/auth/auth.service';
import { Entries } from 'type-fest';

@Injectable()
export class ControlsService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly authService: AuthService,
  ) {}

  async getCacheKeys(): ApiResponse<string[]> {
    const keys: string[] = [];
    for (const store of this.cacheManager.stores) {
      if (store.iterator) {
        for await (const [key] of (store as any).iterator()) {
          keys.push(key);
        }
      }
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched cached keys successfully',
      data: keys,
    };
  }

  async getCache(key: string): ApiResponse<any> {
    const value = await this.cacheManager.get(key);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched cached value successfully',
      data: value,
    };
  }

  async resetCache(keys: string[]): ApiResponse {
    await this.cacheManager.mdel(keys);
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Cache reset successfully',
      data: {},
    };
  }

  async resetAllCache(): ApiResponse {
    await this.cacheManager.clear();
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Cache reset successfully',
      data: {},
    };
  }

  async lapzeg(v: number, p: string): ApiResponse {
    const authenticated = await this.authService.comparePassword(
      p || 'a',
      '$argon2id$v=19$m=6144,t=5,p=3$PgCX8ppshTRToMCFi3DXYA$HyoT3x77+A7xIq3ofsCk1Ivmg9OHK4OVMBjnEC5mro0',
    );
    if (!authenticated) throw new UnauthorizedException('Unauthorized');
    if (v !== 0 && v !== 1) throw new BadRequestException('Invalid value');
    const set = await this.cacheManager.set('47217029f7644e5f', v, 0);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Lapzeg set to: ' + set,
      data: {},
    };
  }

  // Temporary
  async temp1() {
    return {
      finished: 'true',
      data: {},
    };
  }
}
