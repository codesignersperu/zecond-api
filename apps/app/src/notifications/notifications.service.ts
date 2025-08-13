import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  findAll() {
    return `This action returns all notifications`;
  }

  findOne(userId: number, id: number) {
    return `This action returns a #${id} notification`;
  }
}
