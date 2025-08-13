import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { AuthStrategy } from '../enums';
import { CHECK_USER_ACTIVE_STATUS, PUBLIC_ROUTE_KEY } from '../constants';
import { AuthRequestMetadata } from '../types';

@Injectable()
export class AuthGuard extends PassportAuthGuard(AuthStrategy.JWT) {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const isActiveUserOnly = this.reflector.getAllAndOverride<boolean>(
      CHECK_USER_ACTIVE_STATUS,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    request.metadata = {
      isActiveUserOnly: !!isActiveUserOnly,
    } satisfies AuthRequestMetadata;

    return super.canActivate(context);
  }
}
