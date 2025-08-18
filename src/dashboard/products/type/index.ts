import { Product, ProductImage, Bids, User } from 'src/db/schemas';

export interface ProductResponse extends Product {
  images: Pick<ProductImage, 'id' | 'url'>[];
  bids: Pick<Bids, 'amount'>[];
  seller: Pick<
    User,
    | 'id'
    | 'firstName'
    | 'lastName'
    | 'username'
    | 'email'
    | 'avatarUrl'
    | 'isInfluencer'
  >;
}
