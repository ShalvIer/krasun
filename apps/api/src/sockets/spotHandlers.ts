import { spotInputSchema } from "@krasun/shared-validation";
import type { KrasunServer, KrasunSocket } from "./helpers.js";
import { accessibleSpotWhere, serializeSpot, spotInclude } from "../spots/service.js";
import { prisma } from "../lib/prisma.js";

export function registerSpotHandlers(io: KrasunServer, socket: KrasunSocket) {
  const userId = socket.data.userId;
  socket.on("spot:create", (raw) => { void (async () => { const row = await prisma.spot.create({ data: { ...spotInputSchema.parse(raw), ownerId: userId }, include: spotInclude }); const memberships = await prisma.groupMember.findMany({ where: { userId, active: true }, select: { groupId: true } }); memberships.forEach(({ groupId }) => io.to(`group:${groupId}`).emit("spot:created", serializeSpot(row))); })().catch(() => socket.emit("server:error", { message: "Spot creation failed" })); });
  socket.on("spot:update", (raw) => { void (async () => { const existing = await prisma.spot.findFirstOrThrow({ where: { id: raw.id, ownerId: userId, deletedAt: null } }); const row = await prisma.spot.update({ where: { id: existing.id }, data: { title: raw.title, description: raw.description, visibility: raw.visibility }, include: spotInclude }); const groups = await prisma.groupMember.findMany({ where: { userId, active: true } }); groups.forEach(({ groupId }) => io.to(`group:${groupId}`).emit("spot:updated", serializeSpot(row))); })().catch(() => socket.emit("server:error", { message: "Spot update failed" })); });
  socket.on("spot:delete", ({ id }) => { void prisma.spot.updateMany({ where: { id, ownerId: userId, deletedAt: null }, data: { deletedAt: new Date() } }).then(async ({ count }) => { if (!count) return; const groups = await prisma.groupMember.findMany({ where: { userId, active: true } }); groups.forEach(({ groupId }) => io.to(`group:${groupId}`).emit("spot:deleted", { id, ownerId: userId })); }); });
  void accessibleSpotWhere;
}
