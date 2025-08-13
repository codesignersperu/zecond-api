import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type {
  AuctionWinnerWsResponse,
  BidsWsResponse,
} from './types/bids-response.type';

@WebSocketGateway({
  transports: ['websocket', 'polling'],
  cors: { origin: '*' },
  namespace: 'products',
})
export class ProductsGateway {
  @WebSocketServer()
  server: Server;
  ROOM_PREFIX = 'auction_';

  private roomName(productId: number) {
    return this.ROOM_PREFIX + productId;
  }

  @SubscribeMessage('joinAuction')
  handleJoinAuction(socket: Socket, data: { productId: number }): void {
    socket.join(this.roomName(data.productId));
    socket.emit('joinedAuction', {
      data: {},
    });
  }

  @SubscribeMessage('leaveAuction')
  handleLeaveAuction(socket: Socket, data: { productId: number }): void {
    socket.leave(this.roomName(data.productId));
  }

  sendNewBid(productId: number, bid: BidsWsResponse) {
    this.server.to(this.roomName(productId)).emit('newBid', bid);
  }

  sendAuctionWinner(productId: number, data: AuctionWinnerWsResponse) {
    this.server.to(this.roomName(productId)).emit('auctionWinner', data);
  }
}
