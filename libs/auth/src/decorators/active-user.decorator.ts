import { SetMetadata } from '@nestjs/common';
import { CHECK_USER_ACTIVE_STATUS } from '../constants';

export const ActiveUserOnly = () => SetMetadata(CHECK_USER_ACTIVE_STATUS, true);
