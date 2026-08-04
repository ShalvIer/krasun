import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from "@krasun/shared-socket-events";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../auth/tokenService.js";
import { registerPresenceHandlers } from "./presenceHandlers.js";
import { registerGroupHandlers } from "./groupHandlers.js";
import { registerChatHandlers } from "./chatHandlers.js";
import { registerMapHandlers } from "./mapHandlers.js";
import { registerSpotHandlers } from "./spotHandlers.js";

export function createSocketServer(server: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(server, { cors: { origin: env.WEB_URL, credentials: true }, maxHttpBufferSize: 1_000_000 });
  io.use((socket, next) => {
    const token = typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : "";
    try { socket.data.userId = verifyAccessToken(token).sub; socket.data.locationSharing = false; next(); }
    catch { next(new Error("Authentication required")); }
  });
  io.on("connection", (socket) => {
    void socket.join(`user:${socket.data.userId}`);
    void registerPresenceHandlers(io, socket);
    registerGroupHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerMapHandlers(io, socket);
    registerSpotHandlers(io, socket);
  });
  return io;
}
