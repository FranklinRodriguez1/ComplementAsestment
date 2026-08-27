import type { Message } from "@domain/entities/message.entity";

/**
 * Port for broadcasting a newly-sent message to whoever is watching its
 * channel in real time. Same pattern as PasswordHasher/TokenService: the
 * domain describes the capability, infrastructure/sockets/socket-server.ts
 * provides the only implementation (Socket.io), so nothing above this
 * interface needs to import socket.io.
 */
export interface RealtimePublisher {
  publishNewMessage(message: Message): void;
}
