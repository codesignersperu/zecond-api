import type Stripe from 'stripe';
import type { PromoAppliesTo, DiscountType } from '../DTOs';
import type { CouponResponse } from './coupons';

export type PromoMetadata = {
  appliesTo: PromoAppliesTo;
};

export type PromotionCode = {
  id: string;
  code: string;
  couponId: string;
  active: boolean;
  maxRedemptions: number | null;
  timesRedeemed: number;
  restrictions: Stripe.PromotionCode['restrictions'];
  expiresAt: Stripe.PromotionCode['expires_at'];
  created: Stripe.PromotionCode['created'];
  appliesTo: PromoAppliesTo;
  // Status information
  status: {
    usable: boolean;
    expired: boolean;
    exhausted: boolean;
  };
};

// Status information
export type PromotionCodeStatus = {
  usable: boolean;
  expired: boolean;
  exhausted: boolean;
};

export type PromotionCodeResponse = PromotionCode & {
  coupon: CouponResponse;
};

export type PromotionCodePublicResponse = {
  code: string;
  description: string | null;
  usable: boolean;
  invalidReason: string | null;
  appliesTo: PromoAppliesTo;
  discount: {
    type: DiscountType;
    value: number;
  };
  firstTimeTransaction: boolean;
  minimumAmount: number | null;
};
