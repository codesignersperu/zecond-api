import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { AuthStrategy, Role } from '../enums';
import {
  CHECK_USER_ACTIVE_STATUS,
  PUBLIC_ROUTE_KEY,
  ROLES_KEY,
} from '../constants';
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

    let roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles) roles = [Role.USER];

    const isActiveUserOnly = this.reflector.getAllAndOverride<boolean>(
      CHECK_USER_ACTIVE_STATUS,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    request.metadata = {
      isActiveUserOnly: !!isActiveUserOnly,
      roles,
    } satisfies AuthRequestMetadata;

    return super.canActivate(context);
  }
}
