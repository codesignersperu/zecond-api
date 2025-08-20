import {
  Injectable,
  Inject,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { DB_CONNECTION } from 'src/db/db-connection';
import type { Database } from 'src/db/types';
import { DatabaseError } from 'pg';
import {
  and,
  asc,
  avg,
  count,
  desc,
  eq,
  inArray,
  or,
  SQL,
  sql,
} from 'drizzle-orm';
import { AuthService } from 'src/auth/auth.service';
import {
  users,
  reviews,
  connectedAccounts,
  followers,
  products,
  orders,
  orderItems,
  accountProviderEnum,
  subscriptionPlans,
  userSubscriptions,
  subscriptionStatusEnum,
  subscriptionPaymentStatus,
  type ConnectedAccount,
  UserSubscription,
  productImages,
  bids,
  balances,
  transactions,
  Transaction,
  balancesAudit,
} from 'src/db/schemas';
import {
  avatarUrlGenerator,
  calcPagination,
  convertHeicToJpeg,
  deleteFile,
  generateRandomHex,
  pagination,
  safeParseInt,
  sanitizeUsername,
  usernameGen,
} from 'src/lib/utils';
import {
  UserLoginDto,
  UserResponseDto,
  UserUpdateDto,
  UpdatePasswordDto,
} from './DTOs';
import type {
  ConnectedAccountsInResponse,
  GoogleUser,
  UserSignupData,
  InfluencerInResponse,
  InfluencersResponse,
  UserStats,
} from './types';
import { ApiResponse } from 'src/lib/types';
import { ApiStatus } from 'src/lib/enums';
import { ConfigService } from '@nestjs/config';
import { StripeService } from 'src/app/stripe/stripe.service';
import Stripe from 'stripe';
import {
  StipeSubscriptionSession,
  StipeSubscriptionSessionMetaData,
} from 'src/app/stripe/types';
import * as dayjs from 'dayjs';
import { InternalRevenueService as DashboardInternalRevenueService } from 'src/dashboard/revenue/services';
import { Role } from 'src/auth/enums';

@Injectable()
export class UsersService {
  private readonly USER_CONSTRAINT_ERRORS = {
    users_username_unique: 'This Username is already taken',
    users_email_unique: 'This email already exists',
  };

  private readonly NO_OF_REVIEWS_QUERY = sql<number>`(
    SELECT COUNT(*)::int
    FROM reviews
    WHERE reviews.seller_id = users.id
  )`.as('no_of_reviews');

  private readonly AVG_RATING_QUERY = sql<number>`(
    SELECT AVG(rating)::numeric(10,1)
    FROM reviews
    WHERE reviews.seller_id = users.id
  )`.as('avg_rating');

  constructor(
    @Inject(DB_CONNECTION)
    private readonly db: Database,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
    private readonly internalRevenueService: DashboardInternalRevenueService,
  ) {}

  async signup(userSignup: UserSignupData): ApiResponse<{ token: string }> {
    const passwordHash = await this.authService.hashPassword(
      userSignup.password || generateRandomHex(8),
    );
    if (!userSignup.avatarUrl) {
      userSignup.avatarUrl = avatarUrlGenerator(
        userSignup.firstName,
        userSignup.lastName,
      );
    }
    if (!userSignup.username) {
      userSignup.username = usernameGen(
        userSignup.firstName,
        userSignup.lastName,
      );
    }

    let user = await this.db.transaction(async (tx) => {
      try {
        let [user] = await tx
          .insert(users)
          .values({
            firstName: userSignup.firstName,
            lastName: userSignup.lastName,
            username: userSignup.username as string,
            email: userSignup.email,
            passwordHash,
            avatarUrl: userSignup.avatarUrl as string,
          })
          .returning();

        // Creating a balance row for user
        let [balance] = await tx
          .insert(balances)
          .values({
            userId: user.id,
            for: 'user',
          })
          .returning({ id: balances.id });

        await this.db
          .update(users)
          .set({ balanceId: balance.id })
          .where(eq(users.id, user.id));

        return user;
      } catch (e) {
        if (!(e instanceof DatabaseError)) throw e;
        const error: DatabaseError = e;
        // Unique constraints errors
        if (error.code === '23505') {
          throw new BadRequestException(
            this.USER_CONSTRAINT_ERRORS[error.constraint as any] ||
              "Couldn't register account",
          );
        }

        throw error;
      }
    });

    // Subscribing user to free plan
    await this.stripeService.subscribeUserToFreePlan(user.id);

    const token = await this.authService.generateToken(
      {
        id: user.id,
        email: user.email,
      },
      { role: Role.USER },
    );

    return {
      statusCode: HttpStatus.CREATED,
      status: ApiStatus.SUCCESS,
      message: 'Signed up successfully',
      data: { token },
    };
  }

  async login(loginUserDto: UserLoginDto): ApiResponse<{ token: string }> {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(
        and(
          inArray(users.status, ['active', 'disabled', 'pending_approval']),
          eq(users.email, loginUserDto.email),
        ),
      );

    if (!user) {
      throw new NotFoundException("Account Doesn't Exist");
    }

    const isPasswordValid = await this.authService.comparePassword(
      loginUserDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.authService.generateToken(
      {
        id: user.id,
        email: user.email,
      },
      { role: Role.USER },
    );
    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Logged in successfully',
      data: { token },
    };
  }

  // --- Subscription Part ---
  async handleSubscriptionUpdate(
    eventType: Stripe.Event.Type,
    checkoutSession: StipeSubscriptionSession,
  ) {
    if (eventType === 'checkout.session.expired') return;

    let userSubscription: UserSubscription | undefined;
    let transaction: Transaction | undefined;

    const userId = safeParseInt(checkoutSession.metadata.userId);

    if (eventType === 'checkout.session.completed') {
      if (!checkoutSession.metadata.subscriptionId) {
        // pausing prev subscription
        const [prev] = await this.db
          .select({ id: userSubscriptions.id })
          .from(userSubscriptions)
          .where(
            and(
              eq(userSubscriptions.userId, userId),
              eq(userSubscriptions.status, 'active'),
            ),
          )
          .orderBy(desc(userSubscriptions.createdAt))
          .limit(1);

        if (prev) {
          await this.db
            .update(userSubscriptions)
            .set({ status: 'paused' })
            .where(eq(userSubscriptions.id, prev.id));
        }

        userSubscription = await this.createUserSubscription(
          userId,
          checkoutSession.metadata.planId,
          checkoutSession.subscription?.toString() as string,
          'active',
          'paid',
        );

        if (userSubscription) {
          // Adding Transaction
          transaction = await this.internalRevenueService.createTransaction({
            txDetails: {
              for: 'platform',
              type: 'subscription',
              subscriptionId: userSubscription?.id || 0,
              amount: checkoutSession.amount_total
                ? checkoutSession.amount_total / 100
                : 0,
              statusToSet: 'succeeded',
            },
            type: 'available',
          });
        }
      }

      // updating checkout session
      let updateMetadata: Partial<StipeSubscriptionSessionMetaData> = {};
      if (userSubscription)
        updateMetadata.subscriptionId = userSubscription.id.toString();
      if (transaction) updateMetadata.transactionId = transaction.id.toString();

      await this.stripeService.updateCheckoutSession(checkoutSession.id, {
        ...checkoutSession.metadata,
        ...updateMetadata,
      });
    }

    if (eventType === 'checkout.session.async_payment_failed') {
      await this.db.transaction(async (tx) => {
        await tx
          .update(userSubscriptions)
          .set({ status: 'payment_failed', paymentStatus: 'failed' })
          .where(
            or(
              eq(
                userSubscriptions.id,
                Number(checkoutSession.metadata.subscriptionId) || 0,
              ),
              eq(
                userSubscriptions.stripeSubscriptionId,
                checkoutSession.subscription?.toString() as string,
              ),
            ),
          );

        // Marking related transaction as failed
        if (checkoutSession.metadata.transactionId) {
          await this.internalRevenueService.updateTransaction({
            txDetails: {
              transactionId: Number(checkoutSession.metadata.transactionId),
              statusToUpdate: 'payment_failed',
            },
            balanceUpdate: {
              crossTransfer: undefined,
              type: 'available',
              mode: 'decrement',
              validate: true,
            },
            dbTx: tx,
          });
        }

        // Downgrading
        // fetching user's prev subscription
        const prevSubscription = await tx.query.userSubscriptions.findFirst({
          columns: {
            id: true,
            stripeSubscriptionId: true,
          },
          where: eq(userSubscriptions.status, 'paused'),
          orderBy: desc(userSubscriptions.createdAt),
        });
        if (prevSubscription) {
          await tx
            .update(userSubscriptions)
            .set({ status: 'active' })
            .where(eq(userSubscriptions.id, prevSubscription.id));
        }
      });
    }
  }

  async createUserSubscription(
    userId: number,
    planId: string,
    subscriptionId: string,
    status: (typeof subscriptionStatusEnum.enumValues)[number],
    paymentStatus: (typeof subscriptionPaymentStatus.enumValues)[number],
  ) {
    const [existing] = await this.db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));

    if (existing) return existing;

    const [plan] = await this.db
      .select({
        stripePriceId: subscriptionPlans.stripePriceId,
        listingsLimit: subscriptionPlans.listingsLimit,
        auctionsAllowed: subscriptionPlans.auctionsAllowed,
        featuredProductsAllowed: subscriptionPlans.featuredProductsAllowed,
        premiumProductsAllowed: subscriptionPlans.premiumProductsAllowed,
      })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.planId, planId));

    if (!plan) throw new Error('Plan not found, id: ' + planId);

    const [subscription] = await this.db
      .insert(userSubscriptions)
      .values({
        userId,
        planId: planId,
        status: status,
        paymentStatus: paymentStatus,
        listingsRemaining: plan.listingsLimit,
        renewedAt: dayjs().toDate(),
        nextRenewal: dayjs().add(1, 'month').startOf('day').toDate(),
        stripeSubscriptionId: subscriptionId,
      })
      .returning();

    return subscription;
  }

  async isSubscriptionUpdated(sessionId: string): ApiResponse {
    const checkoutMetaData =
      await this.stripeService.getCheckoutSessionMetaData(sessionId);

    if (
      checkoutMetaData.type === 'subscription' &&
      !checkoutMetaData.subscriptionId
    )
      throw new BadRequestException('Subscription not updated yet');

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Subscription updated successfully',
      data: {},
    };
  }

  // --------------------------

  async googleCallback(user: GoogleUser): Promise<{ url: string }> {
    const userExists = await this.db.query.users.findFirst({
      where: eq(users.email, user.emails[0].value),
      columns: { id: true },
    });

    let response = {
      url: this.configService.getOrThrow('CLIENT_OAUTH_REDIRECT') + '?token=',
    };

    if (userExists) {
      const token = await this.authService.generateToken(
        {
          id: userExists.id,
          email: user.emails[0].value,
        },
        { role: Role.USER },
      );
      response.url += token;
    } else {
      const signupResponse = await this.signup({
        email: user.emails[0].value,
        firstName: user.name.givenName,
        lastName: user.name.familyName,
        avatarUrl: user.photos[0].value,
      });

      const [_user] = await this.db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, user.emails[0].value));

      await this.db.insert(connectedAccounts).values({
        provider: 'google',
        providerUserId: _user.email,
        userId: _user.id,
      });

      response.url += signupResponse.data.token;
    }

    return response;
  }

  async findMe(id: number): ApiResponse<UserResponseDto> {
    let user = await this.db.query.users.findFirst({
      columns: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        avatarUrl: true,
        isInfluencer: true,
        status: true,
      },
      with: {
        subscriptions: {
          columns: {
            planId: true,
            listingsRemaining: true,
          },
          with: {
            plan: {
              columns: {
                id: true,
                title: true,
              },
            },
          },
          where: eq(userSubscriptions.status, 'active'),
          orderBy: desc(userSubscriptions.createdAt),
          limit: 1,
        },
      },
      where: and(
        inArray(users.status, ['active', 'disabled', 'pending_approval']),
        eq(users.id, id),
      ),
      extras: {
        noOfReviews: this.NO_OF_REVIEWS_QUERY,
        rating: this.AVG_RATING_QUERY,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // @ts-ignore
    user.rating = parseFloat(user.rating || 0);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Found myself successfully',
      data: user,
    };
  }

  async getConnectedAccounts(
    id: number,
  ): ApiResponse<ConnectedAccountsInResponse> {
    const _connectedAccounts = await this.db
      .select({ provider: connectedAccounts.provider })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.userId, id));

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched users connected accounts',
      data: _connectedAccounts,
    };
  }

  async disconnectAccount(
    userId: number,
    provider: ConnectedAccount['provider'],
  ): ApiResponse {
    if (!accountProviderEnum.enumValues.includes(provider))
      throw new BadRequestException('Wrong provider');

    await this.db
      .delete(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, userId),
          eq(connectedAccounts.provider, provider),
        ),
      );

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Disconnected account',
      data: {},
    };
  }

  async getInfluencers(
    page?: string,
    _limit?: string,
    ids?: number[],
    withLiveProducts?: boolean,
  ): ApiResponse<InfluencersResponse> {
    const query: SQL[] = [eq(users.status, 'active')];
    if (ids) {
      query.push(inArray(users.id, ids));
    } else {
      query.push(eq(users.isInfluencer, true));
    }

    const { offset, pagination } = await calcPagination(
      this.db
        .select({ total: count(users.id) })
        .from(users)
        .where(and(...query))
        .$dynamic(),
      page,
      _limit,
    );

    let queryBuilder = this.db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        noOfReviews: count(reviews.id),
        rating: avg(reviews.rating),
        liveProducts: count(products.id),
      })
      .from(users)
      .$dynamic();

    if (withLiveProducts) {
      queryBuilder = queryBuilder.innerJoin(
        products,
        and(eq(products.sellerId, users.id), eq(products.status, 'live')),
      );
    } else {
      queryBuilder = queryBuilder.leftJoin(
        products,
        and(eq(products.sellerId, users.id), eq(products.status, 'live')),
      );
    }

    const combinedData = await queryBuilder
      .leftJoin(reviews, eq(users.id, reviews.sellerId))
      .where(and(...query))
      .groupBy(
        // Important: Group by all selected non-aggregated user fields
        users.id,
        users.username,
        users.firstName,
        users.lastName,
        users.avatarUrl,
      )
      .orderBy(asc(users.id))
      .offset(offset)
      .limit(pagination.limit);

    const influencers: InfluencerInResponse[] = combinedData.map((row) => {
      return {
        ...row,
        noOfReviews: Number(row.noOfReviews || 0),
        rating: Number(row.rating || 0),
      };
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched Influencers',
      data: {
        influencers,
        pagination,
      },
    };
  }

  async getInfluencersByQuery(query: string): ApiResponse {
    let influencers = await this.db
      .select({
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(
        and(
          eq(users.status, 'active'),
          eq(users.isInfluencer, true),
          sql`${users.textSearch} @@ plainto_tsquery(${query})`,
        ),
      )
      .orderBy(
        sql`ts_rank(${users.textSearch}, plainto_tsquery(${query})) DESC`,
      )
      .limit(10);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Following are the results',
      data: influencers,
    };
  }

  async toggleFollowing(userId: number, influencerId: number): ApiResponse {
    if (userId === influencerId)
      throw new BadRequestException("Can't follow yourself");

    try {
      await this.db.insert(followers).values({
        followerId: userId,
        followingId: influencerId,
      });
    } catch (e) {
      if (!(e instanceof DatabaseError)) throw e;
      const error = e as DatabaseError;
      if (error.code === '23505') {
        await this.db
          .delete(followers)
          .where(
            and(
              eq(followers.followerId, userId),
              eq(followers.followingId, influencerId),
            ),
          );

        return {
          statusCode: HttpStatus.OK,
          status: ApiStatus.SUCCESS,
          message: 'Unfollowed ' + influencerId,
          data: {},
        };
      }
      throw e;
    }

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Followed ' + influencerId,
      data: {},
    };
  }

  async getInfluencer(
    id?: number,
    username?: string,
  ): ApiResponse<InfluencerInResponse> {
    const query = [eq(users.isInfluencer, true)];

    if (id) {
      query.push(eq(users.id, id));
    } else if (username) {
      query.push(eq(users.username, username));
    }

    const _influencer = await this.db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatarUrl: users.avatarUrl,
        noOfReviews: count(reviews.id),
        rating: avg(reviews.rating),
        liveProducts: count(products.id),
      })
      .from(users)
      .leftJoin(reviews, eq(users.id, reviews.sellerId))
      .leftJoin(
        products,
        and(eq(products.sellerId, users.id), eq(products.status, 'live')),
      )
      .where(and(...query))
      .groupBy(
        // Important: Group by all selected non-aggregated user fields
        users.id,
        users.username,
        users.firstName,
        users.lastName,
        users.avatarUrl,
      )
      .orderBy(asc(users.id));

    if (!_influencer.length)
      throw new NotFoundException('Influencer Not found');

    const influencer: InfluencerInResponse = {
      ..._influencer[0],
      noOfReviews: Number(_influencer[0].noOfReviews || 0),
      rating: Number(_influencer[0].rating || 0),
    };

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Fetched Influencer',
      data: influencer,
    };
  }

  async getFollowings(
    id: number,
    page?: string,
    limit?: string,
  ): ApiResponse<InfluencersResponse> {
    const { data: followingIds } = await this.getFollowingIds(id);

    if (!followingIds || followingIds.length === 0) {
      return {
        statusCode: HttpStatus.OK,
        status: ApiStatus.SUCCESS,
        message: 'User is not following anyone or no followings found.',
        data: {
          influencers: [],
          pagination: { page: 1, limit: 25, total: 0 },
        },
      };
    }

    const influencersResponse = await this.getInfluencers(
      page,
      limit,
      followingIds,
    );

    return influencersResponse;
  }

  async getFollowingIds(id: number): ApiResponse<number[]> {
    const _followingIds = await this.db
      .select({ id: followers.followingId })
      .from(followers)
      .where(eq(followers.followerId, id));

    const followingIds = _followingIds.map((v) => v.id);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Users following ids fetched',
      data: followingIds,
    };
  }

  async getSellerStats(id: number): ApiResponse<UserStats> {
    // TODO: run 1 query
    // make 1 query, make multiple joins of same table with aliases
    // consult: https://orm.drizzle.team/docs/joins#aliases--selfjoins
    // TODO: cache this with redis
    const stats: UserStats = {
      followers: 0,
      following: 0,
      noOfReviews: 0,
      ordersPending: 0,
      products: {
        active: 0,
        draft: 0,
        sold: 0,
      },
      rating: 0,
    };
    // things to fetch
    // 1- user's rating & no. of reviews
    const [{ rating, noOfReviews }] = await this.db
      .select({ noOfReviews: count(reviews.id), rating: avg(reviews.rating) })
      .from(reviews)
      .where(eq(reviews.sellerId, id));

    stats.rating |= Number(rating);
    stats.noOfReviews = noOfReviews;
    // 2- number of followers
    const [{ _followers }] = await this.db
      .select({ _followers: count(followers.followerId) })
      .from(followers)
      .where(eq(followers.followingId, id));

    stats.followers = _followers;

    // 3- number followed
    const [{ _following }] = await this.db
      .select({ _following: count(followers.followerId) })
      .from(followers)
      .where(eq(followers.followerId, id));

    stats.following = _following;

    // 4- number of active products
    const [{ active }] = await this.db
      .select({ active: count(products.id) })
      .from(products)
      .where(and(eq(products.status, 'live'), eq(products.sellerId, id)));

    stats.products.active = active;

    // 5- number of orders pending
    const [{ _orders }] = await this.db
      .select({ _orders: count(orders.id) })
      .from(users)
      .innerJoin(products, eq(products.sellerId, id))
      .innerJoin(orderItems, eq(orderItems.productId, products.id))
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(users.id, id), eq(orders.status, 'pending')));

    stats.ordersPending = _orders;

    // 6- number of products sold
    const [{ sold }] = await this.db
      .select({ sold: count(products.id) })
      .from(products)
      .where(and(eq(products.status, 'sold'), eq(products.sellerId, id)));

    stats.products.sold = sold;

    // 7- number of products in draft
    const [{ draft }] = await this.db
      .select({ draft: count(products.id) })
      .from(products)
      .where(and(eq(products.status, 'draft'), eq(products.sellerId, id)));

    stats.products.draft = draft;

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Users stats fetched',
      data: stats,
    };
  }

  // Reviews

  async reviews(userId: number): ApiResponse {
    const _reviews = await this.db.query.reviews.findMany({
      where: eq(reviews.userId, userId),
      columns: {
        id: true,
        status: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
      with: {
        order: { columns: { id: true, createdAt: true } },
        product: {
          columns: { title: true, price: true, isAuction: true },
          with: {
            images: {
              columns: { url: true },
              limit: 1,
              orderBy: asc(productImages.id),
            },
            bids: {
              columns: {
                amount: true,
              },
              limit: 1,
              orderBy: desc(bids.createdAt),
            },
          },
        },
      },
      orderBy: [
        sql`${reviews.status} = 'pending' DESC`,
        desc(reviews.createdAt),
      ],
    });

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Reviews retrieved successfully',
      data: _reviews,
    };
  }

  async updateReview(
    userId: number,
    reviewId: number,
    rating: number,
  ): ApiResponse {
    await this.db
      .update(reviews)
      .set({ status: 'reviewed', rating })
      .where(and(eq(reviews.userId, userId), eq(reviews.id, reviewId)));

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Review updated successfully',
      data: {},
    };
  }

  async updateProfile(
    id: number,
    avatarUrl: Express.Multer.File | null,
    payload: UserUpdateDto,
  ): ApiResponse {
    if (avatarUrl) {
      const [user] = await this.db
        .select({ avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, id));
      // check if the avatar is not from ui-avatars.com, then delete the old profile picture
      if (!user.avatarUrl.match(/ui-avatars.com/)) {
        await deleteFile(user.avatarUrl);
      }
      // converting heif to jpg first
      if (avatarUrl.mimetype === 'image/heic') {
        const outputUrl = await convertHeicToJpeg(avatarUrl.path);
        avatarUrl.path = outputUrl;
      }

      // @ts-ignore
      payload.avatarUrl = '/' + avatarUrl.path;
    } else if (payload.deleteAvatar) {
      // Delete the profile picture
      const [user] = await this.db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, id));
      // check if the avatar is from ui-avatars.com, then throw the bad request exception
      if (user.avatarUrl.match(/ui-avatars.com/)) {
        throw new BadRequestException('Cannot delete default avatar');
      }
      await deleteFile(user.avatarUrl);
      // @ts-ignore
      payload.avatarUrl = avatarUrlGenerator(user.firstName, user.lastName);
    }
    const response = {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Updated profile successfully',
      data: {},
    };

    if (!Object.keys(payload).length) return response;

    // Update the avatar if firstName or lastName is changed
    if (payload.firstName || payload.lastName) {
      const [avatarChange] = await this.db
        .select({ f: users.firstName, l: users.lastName, a: users.avatarUrl })
        .from(users)
        .where(eq(users.id, id));
      if (avatarChange.a.match(/ui-avatars.com/)) {
        // @ts-ignore
        payload.avatarUrl = avatarUrlGenerator(
          payload.firstName || avatarChange.f,
          payload.lastName || avatarChange.l,
        );
      }
    }
    // Sanitizing username
    if (payload.username) payload.username = sanitizeUsername(payload.username);
    try {
      await this.db.update(users).set(payload).where(eq(users.id, id));
    } catch (e) {
      if (!(e instanceof DatabaseError)) throw e;
      const error: DatabaseError = e;
      // Unique constraints errors
      if (error.code === '23505') {
        throw new BadRequestException(
          this.USER_CONSTRAINT_ERRORS[error.constraint as any] ||
            'Cannot Update Profile',
        );
      }
    }

    return response;
  }

  async updatePassword(
    id: number,
    updatePasswordDto: UpdatePasswordDto,
  ): ApiResponse {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));

    if (!user) {
      throw new NotFoundException("User Doesn't Exist");
    }

    // Validating old password
    const isPasswordValid = await this.authService.comparePassword(
      updatePasswordDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    // Updating new password
    const hashedPassword = await this.authService.hashPassword(
      updatePasswordDto.newPassword,
    );
    await this.db
      .update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.id, id));

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Updated password successfully',
      data: {},
    };
  }

  async logout(userId: string, sessionId: string): ApiResponse {
    await this.authService.invalidateToken(userId, sessionId);

    return {
      statusCode: HttpStatus.OK,
      status: ApiStatus.SUCCESS,
      message: 'Logged out successfully',
      data: {},
    };
  }
}
