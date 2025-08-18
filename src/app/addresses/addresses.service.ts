import { DB_CONNECTION } from 'src/db/db-connection';
import type { Database } from 'src/db/types';
import { addresses, type Address, users, orders } from 'src/db/schemas';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { CreateAddressDto, UpdateAddressDto } from './DTOs';
import type { ApiResponse } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';

@Injectable()
export class AddressesService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    @Inject(CACHE_MANAGER)
    private readonly cacheManger: Cache,
  ) {}

  async create(
    userId: number,
    createAddressDto: CreateAddressDto,
  ): ApiResponse {
    const existingAddresses = await this.checkExistance({
      userId,
      notThrow: true,
    });

    const isPrimary = !existingAddresses;

    if (isPrimary) {
      // check if user has phone number or not.
      const [user] = await this.db
        .select({ phone: users.phoneNumber })
        .from(users)
        .where(eq(users.id, userId));
      if (!user.phone) {
        await this.db
          .update(users)
          .set({ phoneNumber: createAddressDto.phoneNumber })
          .where(eq(users.id, userId));
      }
    }

    await this.db.insert(addresses).values({
      userId,
      ...createAddressDto,
      isPrimary,
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Address added',
      data: {},
    };
  }

  async findAll(
    userId: number,
    id?: number,
    primary?: boolean,
  ): ApiResponse<Address[]> {
    const query = [
      eq(addresses.userId, userId),
      eq(addresses.status, 'active'),
    ];

    if (id) {
      query.push(eq(addresses.id, id));
    } else if (primary) {
      query.push(eq(addresses.isPrimary, true));
    }

    const _addresses = await this.db
      .select()
      .from(addresses)
      .where(and(...query))
      .orderBy(addresses.id);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Addresses fetched',
      data: _addresses,
    };
  }

  async findOne(userId: number, id: number): ApiResponse<Address> {
    const [address] = await this.db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.userId, userId),
          eq(addresses.id, id),
          eq(addresses.status, 'active'),
        ),
      );

    if (!address) throw new BadRequestException('Address doesnt exist');

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Addresses fetched',
      data: address,
    };
  }

  async findPrimary(userId: number): ApiResponse<Address> {
    const [address] = await this.db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.userId, userId),
          eq(addresses.isPrimary, true),
          eq(addresses.status, 'active'),
        ),
      )
      .limit(1);

    if (!address) throw new BadRequestException('Primary Address doesnt exist');

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Primary Addresses fetched',
      data: address,
    };
  }

  /**
   * `checkExistance()` checks if an address against an id or a user id is present in
   * database. If no id or user id provided, it throws an error.
   * if `notThrow` param is not set, it throws Http BadRequestException
   * @param Param
   * @returns
   */
  async checkExistance({
    id,
    userId,
    notThrow,
  }: {
    id?: number;
    userId?: number;
    notThrow?: boolean;
  }): Promise<boolean> {
    if (!id && !userId) {
      throw new Error('Please provide at least an address id or a user id');
    }

    const query = [eq(addresses.status, 'active')];

    if (id) {
      query.push(eq(addresses.id, id));
    }

    if (userId) {
      query.push(eq(addresses.userId, userId));
    }

    const _addresses = await this.db
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(...query));

    if (!_addresses.length && !notThrow)
      throw new BadRequestException('Address doesnt exist');

    return Boolean(_addresses.length);
  }

  async update(userId: number, updateAddressDto: UpdateAddressDto) {
    await this.checkExistance({
      id: updateAddressDto.id,
      userId,
    });

    console.log({ updateAddressDto });

    await this.db
      .update(addresses)
      .set(updateAddressDto)
      .where(
        and(
          eq(addresses.userId, userId),
          eq(addresses.id, updateAddressDto.id),
        ),
      );

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Addresses Updated',
      data: {},
    };
  }

  async delete(userId: number, id: number) {
    await this.checkExistance({
      id,
      userId,
    });

    const [prevAddress] = await this.db
      .select({ id: addresses.id, isPrimary: addresses.isPrimary })
      .from(addresses)
      .where(and(eq(addresses.status, 'active'), eq(addresses.userId, userId)));

    // Check if this address is associated to any order
    const [{ _orders }] = await this.db
      .select({ _orders: count(orders.id) })
      .from(orders)
      .where(eq(orders.shippingAddressId, id));

    await this.db.transaction(async (tx) => {
      if (_orders > 0) {
        await tx
          .update(addresses)
          .set({ status: 'deleted', isPrimary: false })
          .where(eq(addresses.id, id))
          .returning();
      } else {
        await tx.delete(addresses).where(eq(addresses.id, id));
      }

      // making another address primary
      if (prevAddress.isPrimary) {
        const randomAddress = await tx.query.addresses.findFirst({
          where: and(
            eq(addresses.status, 'active'),
            eq(addresses.userId, userId),
          ),
          columns: {
            id: true,
          },
          orderBy: desc(addresses.createdAt),
        });

        if (randomAddress) {
          await tx
            .update(addresses)
            .set({ isPrimary: true })
            .where(eq(addresses.id, randomAddress.id));
        }
      }
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Addresses Deleted',
      data: {},
    };
  }
}
