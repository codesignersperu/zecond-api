import type { Product, User, ProductImage, Bids } from 'src/db/schemas';

export const productCardSelect: {
  productColumns: Partial<Record<keyof Product, boolean>>;
  sellerColumns: Partial<Record<keyof User, boolean>>;
  imageColumns: Partial<Record<keyof ProductImage, boolean>>;
  bids: Partial<Record<keyof Bids, boolean>>;
} = {
  productColumns: {
    id: true,
    sellerId: true,
    title: true,
    price: true,
    isAuction: true,
    size: true,
    brand: true,
    color: true,
    condition: true,
    status: true,
  },
  sellerColumns: {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    avatarUrl: true,
    isInfluencer: true,
  },
  imageColumns: {
    id: true,
    url: true,
  },
  bids: {
    amount: true,
  },
};
