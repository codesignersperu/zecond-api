import type { Product, ProductImage, Bids } from 'src/db/schemas';

export interface ProductInResponse extends Product {
  totalBids: number;
  images: Pick<ProductImage, 'id' | 'url'>[];
  seller?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl: string;
    isInfluencer: boolean;
  };
  bids: Pick<Bids, 'amount'>[];
}

export type ProductsInResponse = Pick<
  ProductInResponse,
  | 'id'
  | 'title'
  | 'price'
  | 'isAuction'
  | 'startDate'
  | 'endDate'
  | 'size'
  | 'brand'
  | 'color'
  | 'condition'
  | 'status'
  | 'images'
  | 'seller'
  | 'bids'
>;
