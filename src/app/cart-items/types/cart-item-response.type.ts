import { type CartItem } from 'src/db/schemas';
import type { ProductInResponse } from 'src/app/products/types';

export type CartItemInResponse = {
  id: CartItem['id'];
  expirey: CartItem['expirey'];
  product: Pick<
    ProductInResponse,
    | 'id'
    | 'title'
    | 'price'
    | 'size'
    | 'color'
    | 'brand'
    | 'isAuction'
    | 'images'
    | 'bids'
  >;
};
