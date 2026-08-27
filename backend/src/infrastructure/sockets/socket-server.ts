import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { ChannelRepository } from "@domain/repositories/channel-repository";
import type { TokenService } from "@domain/services/token-service";
import { channelRoom } from "./realtime-publisher";

/**
 * Auth happens once, at handshake, with the same access token the REST API
 * uses (sent as `socket.handshake.auth.token`, never as a query string
 * that could end up in a proxy log). Joining a channel's room is gated by
 * the SAME RLS-protected repository lookup the REST API uses for
 * GET /channels/:id -- a non-member's join silently no-ops, so they can
 * never receive that channel's broadcasts over the socket even if they
 * guess its id.
 */
export function createSocketServer(
  httpServer: HttpServer,
  tokenService: TokenService,
  channelRepository: ChannelRepository,
  corsOrigin: string,
): Server {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") {
      next(new Error("missing token"));
      return;
    }
    try {
      const { sub } = tokenService.verifyAccessToken(token);
      socket.data.userId = sub;
      next();
    } catch {
      next(new Error("invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;

    socket.on("channel:join", async (channelId: string, ack?: (joined: boolean) => void) => {
      const channel = await channelRepository.findById(userId, channelId);
      if (channel) {
        socket.join(channelRoom(channelId));
      }
      ack?.(Boolean(channel));
    });

    socket.on("channel:leave", (channelId: string) => {
      socket.leave(channelRoom(channelId));
    });
  });

  return io;
}
