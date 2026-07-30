import { prisma } from "../lib/prisma.js";
import type { KrasunServer, KrasunSocket } from "./helpers.js";
import { afterReloadGrace, cancelPendingDisconnect } from "./disconnectGrace.js";

export async function registerPresenceHandlers(io: KrasunServer, socket: KrasunSocket) {
  const userId = socket.data.userId;
  cancelPendingDisconnect(userId);
  const memberships = await prisma.groupMember.findMany({ where: { userId, active: true }, select: { groupId: true } });
  socket.join(`user:${userId}`);
  memberships.forEach(({ groupId }) => socket.join(`group:${groupId}`));
  const user = await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  const summary = { id: user.id, username: user.username ?? "user", displayName: user.displayName ?? user.username ?? "Krasun user", profileAvatarPath: user.profileAvatarPath, lastSeenAt: user.lastSeenAt.toISOString() };
  memberships.forEach(({ groupId }) => socket.to(`group:${groupId}`).emit("presence:online", summary));

  const markLocationOfflineIfNeeded = async () => {
    const activeSockets = await io.in(`user:${userId}`).fetchSockets();
    if (activeSockets.some((candidate) => candidate.data.locationSharing)) return;
    const result = await prisma.userLocation.updateMany({ where: { userId, state: "LIVE" }, data: { state: "OFFLINE" } });
    if (!result.count) return;
    const updatedAt = new Date().toISOString();
    memberships.forEach(({ groupId }) => io.to(`group:${groupId}`).emit("map:location-updated", { userId, state: "OFFLINE", coordinates: null, updatedAt }));
  };

  // A fresh connection may be a page reload. Give the restored geolocation
  // watcher time to publish before cleaning up a stale LIVE database state.
  afterReloadGrace(userId, markLocationOfflineIfNeeded);

  socket.on("disconnect", () => {
    afterReloadGrace(userId, async () => {
      const remainingSockets = await io.in(`user:${userId}`).fetchSockets();
      await markLocationOfflineIfNeeded();
      if (remainingSockets.length) return;
      const lastSeenAt = new Date();
      await prisma.user.update({ where: { id: userId }, data: { lastSeenAt } });
      memberships.forEach(({ groupId }) => io.to(`group:${groupId}`).emit("presence:offline", { userId, lastSeenAt: lastSeenAt.toISOString() }));
    });
  });
}
