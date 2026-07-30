import { avatarSchema, coordinateSchema } from "@krasun/shared-validation";
import type { KrasunServer, KrasunSocket } from "./helpers.js";
import { emitToUserGroups } from "./helpers.js";
import { prisma } from "../lib/prisma.js";

const lastPersisted = new Map<string, number>();

export function registerMapHandlers(io: KrasunServer, socket: KrasunSocket) {
  const userId = socket.data.userId;
  socket.on("map:location-update", (raw) => {
    void (async () => {
      const input = coordinateSchema.parse(raw);
      if (input.timestamp && Math.abs(Date.now() - input.timestamp) > 60_000) throw new Error("Stale coordinate rejected");
      socket.data.locationSharing = true;
      const payload = { userId, state: "LIVE" as const, coordinates: { latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy }, updatedAt: new Date().toISOString() };
      await emitToUserGroups(io, userId, "map:location-updated", payload);
      if (Date.now() - (lastPersisted.get(userId) ?? 0) > 5000) {
        await prisma.userLocation.upsert({ where: { userId }, update: { state: "LIVE", latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy }, create: { userId, state: "LIVE", latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy } });
        lastPersisted.set(userId, Date.now());
      }
    })().catch((error: unknown) => socket.emit("server:error", { message: error instanceof Error ? error.message : "Location update failed" }));
  });
  socket.on("map:location-freeze", () => { socket.data.locationSharing = false; void prisma.userLocation.update({ where: { userId }, data: { state: "FROZEN", frozenAt: new Date() } }).then((row) => emitToUserGroups(io, userId, "map:location-updated", { userId, state: "FROZEN", coordinates: row.latitude !== null && row.longitude !== null ? { latitude: row.latitude, longitude: row.longitude, accuracy: row.accuracy ?? undefined } : null, updatedAt: row.updatedAt.toISOString() })).catch(() => socket.emit("server:error", { message: "Share a location before freezing" })); });
  socket.on("map:location-hide", () => { socket.data.locationSharing = false; void prisma.userLocation.upsert({ where: { userId }, update: { state: "HIDDEN" }, create: { userId, state: "HIDDEN" } }).then((row) => emitToUserGroups(io, userId, "map:location-updated", { userId, state: "HIDDEN", coordinates: null, updatedAt: row.updatedAt.toISOString() })); });
  socket.on("map:avatar-update", (raw) => { void (async () => { const input = avatarSchema.parse(raw); const row = await prisma.mapAvatar.upsert({ where: { userId }, update: { type: input.type, value: input.value || null }, create: { userId, type: input.type, value: input.value || null } }); await emitToUserGroups(io, userId, "map:avatar-updated", { userId, type: row.type, value: row.value }); })().catch(() => socket.emit("server:error", { message: "Avatar update failed" })); });
}
