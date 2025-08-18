import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  GetCouponsQueryDto,
  CreatePromotionCodeDto,
  UpdatePromotionCodeDto,
  GetPromotionCodesQueryDto,
} from './DTOs';
import { User } from 'src/auth/decorators';
import { JwtPayload } from 'src/auth/types';
import { AuthGuard } from 'src/auth/guards';
import { UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard)
@Controller('dashboard/stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  // Coupon Routes
  @Post('coupons')
  async createCoupon(
    @User() admin: JwtPayload,
    @Body() createCouponDto: CreateCouponDto,
  ) {
    return this.stripeService.createCoupon(+admin.id, createCouponDto);
  }

  @Get('coupons')
  async getCoupons(@Query() query: GetCouponsQueryDto) {
    return this.stripeService.getCoupons(query);
  }

  @Get('coupons/count')
  async getCouponsCount() {
    return this.stripeService.getCouponCount();
  }

  @Patch('coupons/:id')
  async updateCoupon(
    @User() admin: JwtPayload,
    @Param('id') id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ) {
    return this.stripeService.updateCoupon(+admin.id, id, updateCouponDto);
  }

  @Delete('coupons/:id')
  async deleteCoupon(@User() admin: JwtPayload, @Param('id') id: string) {
    return this.stripeService.deleteCoupon(+admin.id, id);
  }

  // Promotion Code Routes
  @Post('promotion-codes')
  async createPromotionCode(
    @User() admin: JwtPayload,
    @Body() createPromotionCodeDto: CreatePromotionCodeDto,
  ) {
    return this.stripeService.createPromotionCode(
      +admin.id,
      createPromotionCodeDto,
    );
  }

  @Get('promotion-codes')
  async getPromotionCodes(@Query() query: GetPromotionCodesQueryDto) {
    return this.stripeService.getPromotionCodes(query);
  }

  @Get('promotion-codes/count')
  async getPromotionCodesCount() {
    return this.stripeService.getPromotionCodeCount();
  }

  @Patch('promotion-codes/:id')
  async updatePromotionCode(
    @User() admin: JwtPayload,
    @Param('id') id: string,
    @Body() updatePromotionCodeDto: UpdatePromotionCodeDto,
  ) {
    return this.stripeService.updatePromotionCode(
      +admin.id,
      id,
      updatePromotionCodeDto,
    );
  }
}
