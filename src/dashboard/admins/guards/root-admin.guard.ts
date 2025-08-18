import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ROOT_ADMIN_EMAIL } from '../constants';

@Injectable()
export class RootAdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.email !== ROOT_ADMIN_EMAIL)
      throw new UnauthorizedException(
        'Root Admin is required to perform this action',
      );
    return true;
  }
}
