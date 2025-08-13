import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { AuthStrategy } from '../enums';

export class GoogleGuard extends PassportAuthGuard(AuthStrategy.GOOGLE) {}
