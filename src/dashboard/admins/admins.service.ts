import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAdminDto, AdminLoginDto } from './DTOs';
import { DB_CONNECTION } from 'src/db/db-connection';
import type { Database } from 'src/db/types';
import {
  adminAuditLogs,
  AdminAuditLogsOperations,
  admins,
} from 'src/db/schemas';
import { AuthService } from 'src/auth/auth.service';
import { and, count, desc, eq, getTableName, gte, lte, SQL } from 'drizzle-orm';
import { ApiStatus } from 'src/lib/enums';
import { DatabaseError } from 'pg';
import type { ApiResponse, Pagination } from 'src/lib/types';
import type {
  AdminResponse,
  AuditLogsResponse,
  AuditLogTimeFrame,
} from './types';
import { pagination } from 'src/lib/utils';
import * as dayjs from 'dayjs';
import { Role } from 'src/auth/enums';

@Injectable()
export class AdminsService {
  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly authService: AuthService,
  ) {}

  async create(adminId: number, createAdminDto: CreateAdminDto): ApiResponse {
    try {
      // @ts-ignore
      createAdminDto.passwordHash = await this.authService.hashPassword(
        createAdminDto.password,
      );
      const [admin] = await this.db
        .insert(admins)
        // @ts-ignore
        .values(createAdminDto)
        .returning();

      if (admin) {
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'CREATE',
          tableName: getTableName(admins),
          recordId: admin.id.toString(),
          beforeValue: {},
          afterValue: admin,
        });
      }
    } catch (e) {
      if (!(e instanceof DatabaseError)) throw e;
      if (e.code !== '23505') throw e;
      throw new BadRequestException('Admin already exists');
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Admin created',
      data: {},
    };
  }

  async login(adminLoginDto: AdminLoginDto): ApiResponse<{ token: string }> {
    const [admin] = await this.db
      .select({
        id: admins.id,
        email: admins.email,
        passwordHash: admins.passwordHash,
      })
      .from(admins)
      .where(
        and(eq(admins.email, adminLoginDto.email), eq(admins.deleted, false)),
      );

    if (!admin) {
      throw new NotFoundException("Account Doesn't Exist");
    }

    const isPasswordValid = await this.authService.comparePassword(
      adminLoginDto.password,
      admin.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.authService.generateToken(
      {
        id: admin.id,
        email: admin.email,
      },
      { role: Role.ADMIN },
    );

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Logged in successfully',
      data: { token },
    };
  }

  async findAll(
    _page?: string,
    _limit?: string,
  ): ApiResponse<{
    admins: AdminResponse[];
    pagination: Pagination;
  }> {
    const { offset, limit, page } = pagination(_page, _limit);
    const total = await this.db.$count(admins);
    const _admins = await this.db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        createdAt: admins.createdAt,
      })
      .from(admins)
      .where(eq(admins.deleted, false))
      .limit(limit)
      .offset(offset);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched admins',
      data: {
        admins: _admins,
        pagination: {
          page,
          limit,
          total,
        },
      },
    };
  }

  async findOne(id: number): ApiResponse<AdminResponse> {
    const admin = await this.db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        createdAt: admins.createdAt,
      })
      .from(admins)
      .where(and(eq(admins.id, id), eq(admins.deleted, false)));

    if (!admin.length) throw new NotFoundException("Admin doesn't exist");

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched admin',
      data: admin[0],
    };
  }

  async getAuditLogs(
    page?: string,
    _limit?: string,
    adminId?: number,
    tableName?: string,
    operation?: AdminAuditLogsOperations,
    timeFrame?: AuditLogTimeFrame,
  ): ApiResponse<{ logs: AuditLogsResponse[]; pagination: Pagination }> {
    const { offset, limit } = pagination(page, _limit);

    const where: SQL[] = [];
    if (adminId) where.push(eq(adminAuditLogs.adminId, adminId));
    if (tableName) where.push(eq(adminAuditLogs.tableName, tableName));
    if (operation) where.push(eq(adminAuditLogs.operation, operation));
    if (timeFrame) {
      switch (timeFrame) {
        case 'today':
          where.push(
            gte(adminAuditLogs.createdAt, dayjs().startOf('day').toDate()),
          );
          break;

        case 'yesterday':
          where.push(
            gte(
              adminAuditLogs.createdAt,
              dayjs().startOf('day').subtract(1, 'day').toDate(),
            ),
          );
          where.push(
            lte(adminAuditLogs.createdAt, dayjs().startOf('day').toDate()),
          );
          break;

        case 'last-week':
          where.push(
            gte(
              adminAuditLogs.createdAt,
              dayjs().startOf('day').subtract(7, 'day').toDate(),
            ),
          );
          break;

        case 'last-month':
          where.push(
            gte(
              adminAuditLogs.createdAt,
              dayjs().startOf('day').subtract(30, 'day').toDate(),
            ),
          );
          break;

        default:
          break;
      }
    }

    const [{ total }] = await this.db
      .select({ total: count(adminAuditLogs.id) })
      .from(adminAuditLogs)
      .where(and(...where));

    const logs = await this.db.query.adminAuditLogs.findMany({
      columns: {
        id: true,
        tableName: true,
        recordId: true,
        operation: true,
        beforeValue: true,
        afterValue: true,
        createdAt: true,
      },
      with: {
        admin: {
          columns: {
            email: true,
            name: true,
          },
        },
      },
      where: and(...where),
      orderBy: desc(adminAuditLogs.createdAt),
      offset,
      limit,
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Logs retrieved successfully',
      data: {
        logs: logs,
        pagination: { page: Number(page || 1), limit, total },
      },
    };
  }

  async remove(adminId: number, id: number): ApiResponse {
    const admin = await this.db.query.admins.findFirst({
      where: and(eq(admins.id, id), eq(admins.deleted, false)),
    });
    if (!admin) throw new NotFoundException("Admin doesn't exist");

    if (admin.email === 'admin@zecond.com')
      throw new BadRequestException("Can't delete root admin");

    const [deleted] = await this.db
      .update(admins)
      .set({ deleted: true })
      .where(eq(admins.id, id))
      .returning();

    if (deleted) {
      await this.db.insert(adminAuditLogs).values({
        adminId,
        operation: 'DELETE',
        tableName: getTableName(admins),
        recordId: deleted.id.toString(),
        beforeValue: deleted,
        afterValue: {},
      });
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Admin deleted',
      data: {},
    };
  }
}
