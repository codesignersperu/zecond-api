export type BidsWsResponse = {
  bidderId: number;
  amount: number;
  bidderName: string;
  at: Date;
};

export type AuctionWinnerWsResponse = {
  productId: number;
  bidderId: number;
  amount: number;
  productTitle: string;
  productImage: string;
};
