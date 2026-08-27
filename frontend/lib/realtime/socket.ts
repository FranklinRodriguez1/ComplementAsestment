import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/api/client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

/**
 * One shared connection for the whole session, created lazily after login
 * (the handshake carries the access token in `auth`, never in the query
 * string, matching the backend's socket-server.ts). Auth happens once at
 * handshake; joining each channel's room is separately gated server-side
 * by the same RLS-backed membership lookup the REST API uses.
 */
export function getSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) {
    return null;
  }
  if (!socket) {
    socket = io(SOCKET_URL, { auth: { token } });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
