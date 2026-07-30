import type { Server, Socket } from "socket.io";
import type { Request } from "express";
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from "@krasun/shared-socket-events";
import { prisma } from "../lib/prisma.js";

export type KrasunServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type KrasunSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function getIo(req: Request) { return req.app.locals.io as KrasunServer | undefined; }

export async function emitToUserGroups(io: KrasunServer, userId: string, event: "map:location-updated" | "map:avatar-updated", payload: Parameters<ServerToClientEvents[typeof event]>[0]) {
  const groups = await prisma.groupMember.findMany({ where: { userId, active: true }, select: { groupId: true } });
  for (const { groupId } of groups) io.to(`group:${groupId}`).emit(event, payload as never);
}
