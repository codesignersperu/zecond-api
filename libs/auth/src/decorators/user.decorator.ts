import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types';

export const User = createParamDecorator(
  (data?: keyof JwtPayload, ctx?: ExecutionContext) => {
    const request = ctx?.switchToHttp().getRequest();
    if (data) {
      return request?.user?.[data];
    }
    return request?.user;
  },
);
