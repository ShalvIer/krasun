import { Router } from "express";
import { z } from "zod";
import { statusSchema } from "@krasun/shared-validation";
import { asyncRoute, HttpError, routeParam } from "../lib/errors.js";
import { requireUserId } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

export const profilesRouter = Router();

profilesRouter.get("/me", asyncRoute(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: requireUserId(req) }, include: { status: true, mapAvatar: true, location: true, preferences: true } });
  if (!user) throw new HttpError(404, "Profile not found");
  res.json({ profile: { ...user, status: user.status?.expiresAt && user.status.expiresAt > new Date() ? user.status : null } });
}));

profilesRouter.get("/:username", asyncRoute(async (req, res) => {
  const viewerId = requireUserId(req);
  const user = await prisma.user.findUnique({ where: { username: routeParam(req, "username") }, include: { status: true, mapAvatar: true, location: true } });
  if (!user) throw new HttpError(404, "Profile not found");
  const common = user.id === viewerId || Boolean(await prisma.groupMember.findFirst({ where: { userId: viewerId, active: true, group: { members: { some: { userId: user.id, active: true } } } } }));
  if (!common) throw new HttpError(403, "Profiles are visible to shared-group members", "PROFILE_FORBIDDEN");
  res.json({ profile: { id: user.id, username: user.username, displayName: user.displayName, profileAvatarPath: user.profileAvatarPath, lastSeenAt: user.lastSeenAt, mapAvatar: user.mapAvatar, location: user.location?.state === "HIDDEN" ? { state: "HIDDEN" } : user.location, status: user.status?.expiresAt && user.status.expiresAt > new Date() ? user.status : null } });
}));

profilesRouter.put("/me/status", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const input = statusSchema.parse(req.body);
  const status = await prisma.userStatus.upsert({ where: { userId }, update: { text: input.text, emoji: input.emoji || null, createdAt: new Date(), expiresAt: new Date(Date.now() + input.durationHours * 60 * 60_000) }, create: { userId, text: input.text, emoji: input.emoji || null, expiresAt: new Date(Date.now() + input.durationHours * 60 * 60_000) } });
  res.json({ status });
}));

profilesRouter.delete("/me/status", asyncRoute(async (req, res) => { await prisma.userStatus.deleteMany({ where: { userId: requireUserId(req) } }); res.status(204).end(); }));

profilesRouter.put("/me/preferences/:key", asyncRoute(async (req, res) => {
  const { value } = z.object({ value: z.unknown() }).parse(req.body);
  const key = z.string().regex(/^[a-z0-9_.-]{1,60}$/i).parse(req.params.key);
  const preference = await prisma.userPreference.upsert({ where: { userId_key: { userId: requireUserId(req), key } }, update: { value: value as object }, create: { userId: requireUserId(req), key, value: value as object } });
  res.json({ preference });
}));
