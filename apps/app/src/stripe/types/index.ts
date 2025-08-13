import type Stripe from 'stripe';

export interface StipeOrderSessionMetaData {
  type: 'order';
  orderId?: string;
  productIds: string;
  buyerId: string;
  addressId: string;
}

export interface StipeSubscriptionSessionMetaData {
  type: 'subscription';
  subscriptionId?: string;
  transactionId?: string;
  planId: string;
  userId: string;
}

export type StripeLineItemProductMetaData = {
  productId: string;
};

export interface CustomLineItem
  extends Omit<Stripe.Checkout.SessionCreateParams.LineItem, 'price_data'> {
  price_data: Omit<
    Stripe.Checkout.SessionCreateParams.LineItem.PriceData,
    'product_data'
  > & {
    product_data: Omit<
      Stripe.Checkout.SessionCreateParams.LineItem.PriceData.ProductData,
      'metadata'
    > & {
      metadata: StripeLineItemProductMetaData;
    };
  };
}

export interface StipeOrderSession
  extends Omit<Stripe.Checkout.Session, 'metadata'> {
  metadata: StipeOrderSessionMetaData;
}

export interface StipeSubscriptionSession
  extends Omit<Stripe.Checkout.Session, 'metadata'> {
  metadata: StipeSubscriptionSessionMetaData;
}
