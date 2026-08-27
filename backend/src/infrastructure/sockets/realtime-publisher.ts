import type { Server } from "socket.io";
import type { Message } from "@domain/entities/message.entity";
import type { RealtimePublisher } from "@domain/services/realtime-publisher";

export function channelRoom(channelId: string): string {
  return `channel:${channelId}`;
}

export class SocketRealtimePublisher implements RealtimePublisher {
  constructor(private readonly io: Server) {}

  publishNewMessage(message: Message): void {
    this.io.to(channelRoom(message.channelId)).emit("message:new", message);
  }
}
