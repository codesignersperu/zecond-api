import { type User, accountProviderEnum } from 'src/db/schemas';
import type { Pagination } from 'src/lib/types';

// export type UserSignupData = Pick<User, 'firstName' | 'lastName' | 'email'> &
//   Partial<Omit<User, 'firstName' | 'lastName' | 'email'>> & {
//     password?: string;
//   };
export type UserSignupData = {
  email: User['email'];
  firstName: User['firstName'];
  lastName: User['lastName'];
  password?: string;
  username?: User['username'];
  phoneNumber?: User['phoneNumber'];
  avatarUrl?: User['avatarUrl'];
  stripeCustomerId?: User['stripeCustomerId'];
};

export type InfluencerInResponse = {
  username: User['username'];
  firstName: User['firstName'];
  lastName: User['lastName'];
  avatarUrl: User['avatarUrl'];
  noOfReviews: number;
  rating: number;
  liveProducts: number;
};

export type InfluencersResponse = {
  influencers: Array<InfluencerInResponse>;
  pagination: Pagination;
};

export type ConnectedAccountsInResponse = Array<{
  provider: (typeof accountProviderEnum.enumValues)[number];
}>;

export type UserStats = {
  rating: number;
  noOfReviews: number;
  followers: number;
  following: number;
  products: {
    active: number;
    sold: number;
    draft: number;
  };
  ordersPending: number;
};

export type GoogleUser = {
  id: string;
  displayName: string;
  name: { familyName: string; givenName: string };
  emails: [{ value: string; verified: boolean }];
  photos: [
    {
      value: string;
    },
  ];
  accessToken: string;
};

export type GoogleUserPhoneNumberResponse = {
  phoneNumbers?: {
    metadata: {
      primary: boolean;
    };
    canonicalForm: string;
  }[];
};
