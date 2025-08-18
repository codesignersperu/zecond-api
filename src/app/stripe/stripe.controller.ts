import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards';
import { ActiveUserOnly, User } from 'src/auth/decorators';
import { JwtPayload } from 'src/auth/types';
import { IdsPipe, ParseAnythingPipe } from 'src/lib/pipes';
import { StripeService as DashboardStripeService } from 'src/dashboard/stripe/stripe.service';
import { type PromotionCodeFor } from 'src/dashboard/stripe/DTOs';

@Controller('stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly dashboardStripeService: DashboardStripeService,
  ) {}

  @Post('create-checkout-session')
  @ActiveUserOnly()
  @ApiOperation({
    summary: 'Creates a checkout session',
  })
  @UseGuards(AuthGuard)
  createCheckoutSession(
    @User() user: JwtPayload,
    @Query('product-ids', IdsPipe) productIds: number[],
    @Query('address-id', new ParseAnythingPipe({ expectedValue: 'number' }))
    addressId: number,
    @Query(
      'promo',
      new ParseAnythingPipe({ expectedValue: 'string', optional: true }),
    )
    promoCode?: string,
  ) {
    return this.stripeService.createCheckoutSession(
      +user.id,
      productIds,
      addressId,
      promoCode,
    );
  }

  @Post('create-subscription-checkout')
  @ActiveUserOnly()
  @ApiOperation({
    summary: 'Creates a subscription checkout session',
  })
  @UseGuards(AuthGuard)
  createSubscriptionSession(
    @User() user: JwtPayload,
    @Query('plan-id', new ParseAnythingPipe({ expectedValue: 'string' }))
    planId: string,
  ) {
    return this.stripeService.createSubscriptionSession(+user.id, planId);
  }

  @Post('webhook')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!request.rawBody) {
      throw new BadRequestException('Missing request body');
    }

    try {
      const event = this.stripeService.constructEventFromPayload(
        signature,
        request.rawBody,
      );

      await this.stripeService.handleWebhookEvent(event);

      return { received: true };
    } catch (error) {
      throw new BadRequestException(
        `Webhook signature verification failed: ${error.message}`,
      );
    }
  }

  @Get('promo-code/:code')
  @UseGuards(AuthGuard)
  async applyPromoCode(
    @Param('code') code: string,
    @Query(
      'for',
      new ParseAnythingPipe<PromotionCodeFor>({
        expectedEnum: ['products', 'subscriptions'],
      }),
    )
    appliedFor: PromotionCodeFor,
  ) {
    return this.dashboardStripeService.getPromotionCode(
      code.toUpperCase(),
      appliedFor,
    );
  }

  @Get('test')
  async test() {
    return 'test';
  }
}
