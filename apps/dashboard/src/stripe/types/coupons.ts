import type { Stripe } from 'stripe';

export type CouponResponse = {
  id: Stripe.Coupon['id'];
  name: Stripe.Coupon['name'];
  percentOff: Stripe.Coupon['percent_off'];
  amountOff: Stripe.Coupon['amount_off'];
  currency: Stripe.Coupon['currency'];
  duration: Stripe.Coupon['duration'];
  durationInMonths: Stripe.Coupon['duration_in_months'];
  timesRedeemed: Stripe.Coupon['times_redeemed'];
  valid: Stripe.Coupon['valid'];
  created: Stripe.Coupon['created'];
};
