import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  Redirect,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  UserSignupDto,
  UserLoginDto,
  UserUpdateDto,
  UpdatePasswordDto,
  UserSignupOpenAPI,
  UserLoginOpenAPI,
  UserUpdateOpenAPI,
  UpdatePasswordOpenAPI,
} from './DTOs';
import { AuthGuard, GoogleGuard } from 'src/auth/guards';
import { JwtPayload } from 'src/auth/types';
import { multerOptions } from 'src/lib/config';
import { FileValidatorPipe } from 'src/lib/pipes';
import { ActiveUserOnly, User } from 'src/auth/decorators';
import { GoogleUser } from './types';
import { type ConnectedAccount } from 'src/db/schemas';
import { ParseAnythingPipe } from 'src/lib/pipes';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  @ApiOperation({
    summary: 'Signs up a new user',
  })
  @ApiBody({
    schema: UserSignupOpenAPI,
  })
  signup(@Body() userSignupDto: UserSignupDto) {
    return this.usersService.signup(userSignupDto);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Logs in a user',
  })
  @ApiBody({
    schema: UserLoginOpenAPI,
  })
  login(@Body() userLoginDto: UserLoginDto) {
    return this.usersService.login(userLoginDto);
  }

  @Get('google/login')
  @UseGuards(GoogleGuard)
  @ApiOperation({
    summary: 'Login User via Google',
  })
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleGuard)
  @Redirect()
  @ApiOperation({
    summary: 'Login User via Google',
  })
  googleCallback(@User() user: GoogleUser) {
    return this.usersService.googleCallback(user);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Fetches user profile',
  })
  findMe(@User('id') userId: string) {
    return this.usersService.findMe(+userId);
  }

  @Get('subscription-updated-check')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary:
      'After user subscribes, they can hit this endpoint to see if their subscription is updated',
  })
  isSubscriptionUpdated(@Query('session-id') sessionId: string) {
    return this.usersService.isSubscriptionUpdated(sessionId);
  }

  @Get('connected-accounts')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: "Fetches user's connected accounts",
  })
  getConnectedAccounts(@User('id') userId: string) {
    return this.usersService.getConnectedAccounts(+userId);
  }

  @Delete('connected-accounts/:provider')
  @UseGuards(AuthGuard)
  @ActiveUserOnly()
  @ApiOperation({
    summary: "Disconnects user's connected account",
  })
  disconnectAccount(
    @User('id') userId: string,
    @Param('provider') provider: ConnectedAccount['provider'],
  ) {
    return this.usersService.disconnectAccount(+userId, provider);
  }

  @Get('influencers')
  @ApiOperation({
    summary: 'Fetches Influencers',
  })
  getInfluencers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query(
      'liveProducts',
      new ParseAnythingPipe({
        expectedValue: 'boolean',
        optional: true,
      }),
    )
    liveProducts?: boolean,
  ) {
    return this.usersService.getInfluencers(page, limit, undefined, false);
  }

  @Get('influencers/following')
  @ApiOperation({
    summary: 'Fetches users following',
  })
  @UseGuards(AuthGuard)
  getUsersFollowing(
    @User('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getFollowings(+userId, page, limit);
  }

  @Get('influencers/find/:query')
  @ApiOperation({
    summary: 'Fetches an influencer by id',
  })
  getInfluencersByQuery(@Param('query') query: string) {
    if (!query) {
      throw new BadRequestException('Query is required');
    }
    return this.usersService.getInfluencersByQuery(query);
  }

  @Get('influencers/id/:id')
  @ApiOperation({
    summary: 'Fetches an influencer by id',
  })
  getInfluencerById(@Param('id') id: string) {
    return this.usersService.getInfluencer(+id);
  }

  @Get('influencers/username/:username')
  @ApiOperation({
    summary: 'Fetches an influencer by username',
  })
  getInfluencerByUsername(@Param('username') username: string) {
    return this.usersService.getInfluencer(undefined, username);
  }

  @Get('influencers/following-ids')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: "Fetches user's influencers following ids",
  })
  getFollowingIds(
    @User('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getFollowingIds(+userId);
  }

  @Post('influencers/follow/:influencerId')
  @UseGuards(AuthGuard)
  @ActiveUserOnly()
  @ApiOperation({
    summary: 'Fetches Influencers',
  })
  toggleFollowing(
    @User('id') userId: string,
    @Param('influencerId') influencerId: string,
  ) {
    return this.usersService.toggleFollowing(+userId, +influencerId);
  }

  // Reviews
  @Get('reviews')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Returns given reviews of a user',
  })
  reviews(@User('id') userId: string) {
    return this.usersService.reviews(+userId);
  }

  @Patch('reviews/:id')
  @UseGuards(AuthGuard)
  @ActiveUserOnly()
  @ApiOperation({
    summary: 'Returns given reviews of a user',
  })
  updateReview(
    @User('id') userId: string,
    @Param('id') reviewId: string,
    @Body('rating') rating: number,
  ) {
    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestException('Invalid rating');
    }
    return this.usersService.updateReview(+userId, +reviewId, rating);
  }

  @Get('seller-stats')
  // TODO: Activate the cache control later
  // @Header('Cache-Control', 'max-age=' + 60 * 60) // 1 hour
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Fetches sellers stats',
  })
  getSellerStats(@User('id') userId: string) {
    return this.usersService.getSellerStats(+userId);
  }

  @Patch('update')
  @UseGuards(AuthGuard)
  @ActiveUserOnly()
  @UseInterceptors(
    FileInterceptor('avatarUrl', multerOptions({ destination: './uploads' })),
  )
  @ApiOperation({
    summary: 'Updates user profile',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: UserUpdateOpenAPI,
  })
  updateProfile(
    @User('id') userId: string,
    @UploadedFile(FileValidatorPipe(false, 2))
    avatarUrl: Express.Multer.File | null,
    @Body() userUpdateDto: UserUpdateDto,
  ) {
    return this.usersService.updateProfile(+userId, avatarUrl, userUpdateDto);
  }

  @Patch('update-password')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Updates user password',
  })
  @ApiBody({
    schema: UpdatePasswordOpenAPI,
  })
  updatePassword(
    @User('id') userId: string,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(+userId, updatePasswordDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Logs out a user & clears its session',
  })
  logout(@User() user: JwtPayload) {
    return this.usersService.logout(user.id, user.sessionId);
  }
}
