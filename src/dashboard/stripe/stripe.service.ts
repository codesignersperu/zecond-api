import { DB_CONNECTION } from 'src/db/db-connection';
import { Database } from 'src/db/types';
import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  CreateCouponDto,
  UpdateCouponDto,
  GetCouponsQueryDto,
  CreatePromotionCodeDto,
  UpdatePromotionCodeDto,
  GetPromotionCodesQueryDto,
  type PromotionCodeFor,
} from './DTOs';
import type { ApiResponse } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';
import type {
  PromotionCodePublicResponse,
  CouponResponse,
  PromotionCodeResponse,
  PromoMetadata,
} from './types';
import { diffObject, isObjEmpty } from 'src/lib/utils';
import { adminAuditLogs } from 'src/db/schemas';
import * as dayjs from 'dayjs';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(configService.getOrThrow('STRIPE_SECRET'), {
      apiVersion: '2025-07-30.basil',
    });
  }

  // ==================== COUPON METHODS ====================

  async createCoupon(
    adminId: number,
    createCouponDto: CreateCouponDto,
  ): ApiResponse {
    try {
      // Check if coupon already exists
      try {
        const existingCoupon = await this.stripe.coupons.retrieve(
          createCouponDto.id,
        );
        if (existingCoupon) {
          throw new BadRequestException(
            `Coupon with ID ${createCouponDto.id} already exists`,
          );
        }
      } catch (error) {
        if (error.code !== 'resource_missing') {
          throw error;
        }
      }

      const couponParams: Stripe.CouponCreateParams = {
        id: createCouponDto.id,
        name: createCouponDto.name,
        currency: 'mxn',
        duration: createCouponDto.duration,
        duration_in_months: createCouponDto.durationInMonths,
      };

      if (createCouponDto.discountType === 'amount') {
        couponParams.amount_off = createCouponDto.amount;
      } else {
        couponParams.percent_off = createCouponDto.amount;
      }

      const cleanParams = Object.fromEntries(
        Object.entries(couponParams).filter(
          ([_, value]) => value !== undefined,
        ),
      );

      const coupon = await this.stripe.coupons.create(cleanParams);

      if (coupon)
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'CREATE',
          tableName: 'coupons',
          recordId: coupon.id,
          beforeValue: {},
          afterValue: this.formatCouponResponse(coupon),
        });

      return {
        statusCode: HttpStatus.OK,
        status: ApiStatus.SUCCESS,
        message: 'created coupon successfully',
        data: {},
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create coupon: ${error.message}`,
      );
    }
  }

  async getCoupons(query: GetCouponsQueryDto): ApiResponse<CouponResponse[]> {
    try {
      const params: Stripe.CouponListParams = {
        limit: query.limit || 10,
        starting_after: query.startingAfter,
        ending_before: query.endingBefore,
        created: query.created,
      };

      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== undefined),
      );

      const coupons = await this.stripe.coupons.list(cleanParams);

      return {
        status: ApiStatus.SUCCESS,
        statusCode: HttpStatus.OK,
        message: 'Coupons retrieved successfully.',
        data: coupons.data.map((coupon) => this.formatCouponResponse(coupon)),
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to retrieve coupons: ${error.message}`,
      );
    }
  }

  async updateCoupon(
    adminId: number,
    id: string,
    updateCouponDto: UpdateCouponDto,
  ): ApiResponse {
    try {
      const coupon = await this.stripe.coupons.update(id, updateCouponDto);

      if (coupon) {
        const { beforeValue, afterValue } = diffObject(
          { name: updateCouponDto.name },
          { name: coupon.name },
        );
        if (!isObjEmpty(beforeValue))
          await this.db.insert(adminAuditLogs).values({
            adminId,
            operation: 'UPDATE',
            tableName: 'coupons',
            recordId: coupon.id,
            beforeValue,
            afterValue,
          });
      }
      return {
        status: ApiStatus.SUCCESS,
        statusCode: HttpStatus.OK,
        message: 'Coupon update successfully.',
        data: {},
      };
    } catch (error) {
      if (error.code === 'resource_missing') {
        throw new NotFoundException(`Coupon with ID ${id} not found`);
      }
      throw new BadRequestException(
        `Failed to update coupon: ${error.message}`,
      );
    }
  }

  async deleteCoupon(adminId: number, id: string): ApiResponse {
    try {
      const coupon = await this.stripe.coupons.retrieve(id);
      const deletedRes = await this.stripe.coupons.del(id);
      if (deletedRes.deleted)
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'DELETE',
          tableName: 'coupons',
          recordId: coupon.id,
          beforeValue: this.formatCouponResponse(coupon),
          afterValue: {},
        });
      return {
        status: ApiStatus.SUCCESS,
        statusCode: HttpStatus.OK,
        message:
          'Coupon deleted successfully. Associated promotion codes are now invalid.',
        data: {},
      };
    } catch (error) {
      if (error.code === 'resource_missing') {
        throw new NotFoundException(`Coupon with ID ${id} not found`);
      }
      throw new BadRequestException(
        `Failed to delete coupon: ${error.message}`,
      );
    }
  }

  async getCouponCount(): ApiResponse<number> {
    try {
      let count = 0;
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const coupons = await this.stripe.coupons.list({
          limit: 100,
          starting_after: startingAfter,
        });

        count += coupons.data.length;
        hasMore = coupons.has_more;

        if (hasMore && coupons.data.length > 0) {
          startingAfter = coupons.data[coupons.data.length - 1].id;
        }
      }

      return {
        status: ApiStatus.SUCCESS,
        statusCode: HttpStatus.OK,
        message: 'Coupons count retrieved successfully.',
        data: count,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get coupon count: ${error.message}`,
      );
    }
  }

  // ==================== PROMOTION CODE METHODS ====================

  async createPromotionCode(
    adminId: number,
    createPromotionCodeDto: CreatePromotionCodeDto,
  ): ApiResponse {
    try {
      // Verify coupon exists
      try {
        await this.stripe.coupons.retrieve(createPromotionCodeDto.coupon);
      } catch (error) {
        if (error.code === 'resource_missing') {
          throw new BadRequestException(
            `Coupon with ID ${createPromotionCodeDto.coupon} not found`,
          );
        }
        throw error;
      }

      const promoMetadata: PromoMetadata = {
        appliesTo: createPromotionCodeDto.appliesTo,
      };

      const promotionCodeParams: Stripe.PromotionCodeCreateParams = {
        coupon: createPromotionCodeDto.coupon,
        code: createPromotionCodeDto.code,
        active: createPromotionCodeDto.active ?? true,
        max_redemptions: createPromotionCodeDto.maxRedemptions,
        expires_at: createPromotionCodeDto.expiresAt,
        metadata: promoMetadata,
      };

      if (
        createPromotionCodeDto.firstTimeTransaction ||
        createPromotionCodeDto.minimumAmount
      ) {
        promotionCodeParams.restrictions = {};
        if (createPromotionCodeDto.firstTimeTransaction)
          promotionCodeParams.restrictions.first_time_transaction = true;
        if (createPromotionCodeDto.minimumAmount) {
          promotionCodeParams.restrictions.minimum_amount =
            createPromotionCodeDto.minimumAmount;
          promotionCodeParams.restrictions.minimum_amount_currency = 'mxn';
        }
      }

      const cleanParams = Object.fromEntries(
        Object.entries(promotionCodeParams).filter(
          ([_, value]) => value !== undefined && value !== null && value !== '',
        ),
      );

      const code = await this.stripe.promotionCodes.create(cleanParams as any);

      if (code)
        await this.db.insert(adminAuditLogs).values({
          adminId,
          operation: 'CREATE',
          tableName: 'promotion_codes',
          recordId: code.id,
          beforeValue: {},
          afterValue: this.formatPromotionCodeResponse(code),
        });

      return {
        status: ApiStatus.SUCCESS,
        statusCode: HttpStatus.OK,
        message: 'Promotion code created successfully.',
        data: {},
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create promotion code: ${error.message}`,
      );
    }
  }

  async getPromotionCodes(
    query: GetPromotionCodesQueryDto,
  ): ApiResponse<PromotionCodeResponse[]> {
    try {
      const params: Stripe.PromotionCodeListParams = {
        limit: query.limit || 10,
        starting_after: query.startingAfter,
        ending_before: query.endingBefore,
        active: query.active,
        code: query.code,
        coupon: query.coupon,
        created: query.created,
      };

      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== undefined),
      );

      const promotionCodes = await this.stripe.promotionCodes.list(cleanParams);

      return {
        status: ApiStatus.SUCCESS,
        statusCode: HttpStatus.OK,
        message: 'Promotion codes retrieved successfully.',
        data: promotionCodes.data.map((pc) =>
          this.formatPromotionCodeResponse(pc, query.for),
        ),
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to retrieve promotion codes: ${error.message}`,
      );
    }
  }

  async getPromotionCode(code: string, appliedFor: PromotionCodeFor) {
    const res = await this.stripe.promotionCodes.list({ code });

    if (!res.data.length)
      throw new NotFoundException(`Promotion code: ${code} not found`);

    const promotionCode = res.data[0];

    return {
      status: ApiStatus.SUCCESS,
      statusCode: HttpStatus.OK,
      message: 'Promotion code retrieved successfully.',
      data: this.formatPromotionCodeForPublic(promotionCode, appliedFor),
    };
  }

  // Internal method
  async getPromotionCodeById(id: string) {
    const promotionCode = await this.stripe.promotionCodes.retrieve(id);

    if (!promotionCode)
      throw new NotFoundException(`Promotion code for id: ${id} not found`);

    return {
      status: ApiStatus.SUCCESS,
      statusCode: HttpStatus.OK,
      message: 'Promotion code retrieved successfully.',
      data: this.formatPromotionCodeResponse(promotionCode),
    };
  }

  async updatePromotionCode(
    adminId: number,
    id: string,
    updatePromotionCodeDto: UpdatePromotionCodeDto,
  ): ApiResponse {
    try {
      const code = await this.stripe.promotionCodes.update(
        id,
        updatePromotionCodeDto,
      );

      if (code) {
        const { beforeValue, afterValue } = diffObject(
          { active: updatePromotionCodeDto.active },
          { active: code.active },
        );
        if (!isObjEmpty(beforeValue))
          await this.db.insert(adminAuditLogs).values({
            adminId,
            operation: 'UPDATE',
            tableName: 'promotion_codes',
            recordId: code.id,
            beforeValue,
            afterValue,
          });
      }

      return {
        status: ApiStatus.SUCCESS,
        statusCode: HttpStatus.OK,
        message: 'Promotion code updated successfully.',
        data: {},
      };
    } catch (error) {
      if (error.code === 'resource_missing') {
        throw new NotFoundException(`Promotion code with ID ${id} not found`);
      }
      throw new BadRequestException(
        `Failed to update promotion code: ${error.message}`,
      );
    }
  }

  async getPromotionCodeCount(): ApiResponse<number> {
    try {
      let count = 0;
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const promotionCodes = await this.stripe.promotionCodes.list({
          limit: 100,
          starting_after: startingAfter,
        });

        count += promotionCodes.data.length;
        hasMore = promotionCodes.has_more;

        if (hasMore && promotionCodes.data.length > 0) {
          startingAfter =
            promotionCodes.data[promotionCodes.data.length - 1].id;
        }
      }

      return {
        status: ApiStatus.SUCCESS,
        statusCode: HttpStatus.OK,
        message: 'Promotion codes count retrieved successfully.',
        data: count,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to get promotion code count: ${error.message}`,
      );
    }
  }

  // ==================== HELPER METHODS ====================

  private formatCouponResponse(coupon: Stripe.Coupon): CouponResponse {
    return {
      id: coupon.id,
      name: coupon.name,
      percentOff: coupon.percent_off,
      amountOff: coupon.amount_off,
      currency: coupon.currency,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months,
      timesRedeemed: coupon.times_redeemed,
      valid: coupon.valid,
      created: coupon.created,
    };
  }

  private formatPromotionCodeResponse(
    promotionCode: Stripe.PromotionCode,
    appliedFor?: PromotionCodeFor,
  ): PromotionCodeResponse {
    const now = Math.floor(Date.now() / 1000);

    // Check if coupon is expanded
    let couponData: any = null;
    if (typeof promotionCode.coupon === 'object') {
      const coupon = promotionCode.coupon as Stripe.Coupon;
      couponData = this.formatCouponResponse(coupon);
    }

    const [isUsable] = this.isPromotionCodeUsable(promotionCode, appliedFor);

    return {
      id: promotionCode.id,
      code: promotionCode.code,
      couponId:
        typeof promotionCode.coupon === 'string'
          ? promotionCode.coupon
          : promotionCode.coupon.id,
      active: promotionCode.active,
      maxRedemptions: promotionCode.max_redemptions,
      timesRedeemed: promotionCode.times_redeemed,
      restrictions: promotionCode.restrictions,
      expiresAt: promotionCode.expires_at,
      created: promotionCode.created,
      appliesTo: (promotionCode.metadata as PromoMetadata).appliesTo,
      // Status information
      status: {
        usable: isUsable,
        expired: promotionCode.expires_at
          ? promotionCode.expires_at <= now
          : false,
        exhausted: promotionCode.max_redemptions
          ? promotionCode.times_redeemed >= promotionCode.max_redemptions
          : false,
      },

      // Include coupon data if expanded
      ...(couponData && { coupon: couponData }),
    };
  }

  private formatPromotionCodeForPublic(
    promotionCode: Stripe.PromotionCode,
    appliedFor: PromotionCodeFor,
  ): PromotionCodePublicResponse {
    const [isUsable, invalidReason] = this.isPromotionCodeUsable(
      promotionCode,
      appliedFor,
    );

    return {
      code: promotionCode.code,
      description: promotionCode.coupon.name,
      usable: isUsable,
      invalidReason: invalidReason,
      appliesTo: (promotionCode.metadata as PromoMetadata).appliesTo,
      // Discount information (from coupon)
      discount: {
        type: promotionCode.coupon.percent_off ? 'percent' : 'amount',
        value:
          promotionCode.coupon.percent_off ||
          promotionCode.coupon.amount_off ||
          0,
      },

      firstTimeTransaction:
        promotionCode.restrictions?.first_time_transaction || false,
      minimumAmount: promotionCode.restrictions?.minimum_amount || null,
    };
  }

  private isPromotionCodeUsable(
    promotionCode: Stripe.PromotionCode,
    appliedFor?: PromotionCodeFor,
  ): [boolean, string | null] {
    if (!promotionCode.active) return [false, 'Promotion code is inactive'];

    const now = dayjs().unix();
    if (promotionCode.expires_at && promotionCode.expires_at <= now)
      return [false, 'Promotion code has expired'];
    if (
      promotionCode.max_redemptions &&
      promotionCode.times_redeemed >= promotionCode.max_redemptions
    )
      return [false, 'Promotion code has reached maximum redemptions'];

    // Check coupon validity if expanded
    if (typeof promotionCode.coupon === 'object') {
      const coupon = promotionCode.coupon as Stripe.Coupon;
      if (!coupon.valid) return [false, 'Associated coupon is no longer valid'];
    }

    const metadata = promotionCode.metadata as PromoMetadata;

    if (
      (metadata.appliesTo === 'products' && appliedFor === 'subscriptions') ||
      (metadata.appliesTo === 'subscriptions' && appliedFor === 'products')
    )
      return [false, 'This code is only for ' + metadata.appliesTo];

    return [true, null];
  }
}
