import { Router } from "express";
import { avatarSchema, coordinateSchema, routeSchema } from "@krasun/shared-validation";
import { asyncRoute, HttpError, routeParam } from "../lib/errors.js";
import { requireUserId } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { requireMembership } from "../groups/service.js";
import { locationForMapViewer } from "./locationVisibility.js";

export const mapRouter = Router();

mapRouter.get("/groups/:groupId/state", asyncRoute(async (req, res) => {
  const groupId = routeParam(req, "groupId");
  const viewerId = requireUserId(req);
  await requireMembership(viewerId, groupId);
  const members = await prisma.groupMember.findMany({ where: { groupId, active: true }, include: { user: { include: { location: true, mapAvatar: true, status: true } } } });
  res.json({ users: members.map(({ user, role }) => ({ id: user.id, username: user.username ?? "user", displayName: user.displayName ?? user.username ?? "Krasun user", profileAvatarPath: user.profileAvatarPath, lastSeenAt: user.lastSeenAt, role, location: locationForMapViewer(viewerId, user.id, user.location), mapAvatar: user.mapAvatar, status: user.status?.expiresAt && user.status.expiresAt > new Date() ? user.status : null })) });
}));

mapRouter.put("/location", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const input = coordinateSchema.parse(req.body);
  const location = await prisma.userLocation.upsert({ where: { userId }, update: { state: "LIVE", latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy }, create: { userId, state: "LIVE", latitude: input.latitude, longitude: input.longitude, accuracy: input.accuracy } });
  res.json({ location });
}));

mapRouter.post("/location/freeze", asyncRoute(async (req, res) => {
  const location = await prisma.userLocation.update({ where: { userId: requireUserId(req) }, data: { state: "FROZEN", frozenAt: new Date() } }).catch(() => null);
  if (location?.latitude == null || location.longitude == null) throw new HttpError(400, "Share a location before freezing", "NO_LOCATION");
  res.json({ location });
}));

mapRouter.post("/location/hide", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const location = await prisma.userLocation.upsert({ where: { userId }, update: { state: "HIDDEN" }, create: { userId, state: "HIDDEN" } });
  res.json({ location });
}));

mapRouter.put("/avatar", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const input = avatarSchema.parse(req.body);
  if (["PHOTO", "GIF", "VIDEO"].includes(input.type) && input.value && !input.value.startsWith("/api/")) throw new HttpError(400, "Upload media before assigning this avatar type", "INVALID_AVATAR_MEDIA");
  const avatar = await prisma.mapAvatar.upsert({ where: { userId }, update: { type: input.type, value: input.value || null }, create: { userId, type: input.type, value: input.value || null } });
  res.json({ avatar });
}));

mapRouter.post("/route", asyncRoute(async (req, res) => {
  requireUserId(req);
  const input = routeSchema.parse(req.body);
  if (!env.MAPBOX_SERVER_TOKEN) throw new HttpError(503, "Mapbox Directions is not configured", "MAPBOX_NOT_CONFIGURED");
  const profile = input.mode === "WALKING" ? "walking" : "driving";
  const coordinates = `${input.from.longitude},${input.from.latitude};${input.to.longitude},${input.to.latitude}`;
  const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?geometries=geojson&overview=full&access_token=${encodeURIComponent(env.MAPBOX_SERVER_TOKEN)}`);
  if (!response.ok) throw new HttpError(502, "Mapbox could not build this route", "ROUTE_FAILED");
  const data = await response.json() as { routes?: Array<{ geometry: { type: "LineString"; coordinates: number[][] }; distance: number; duration: number }> };
  const route = data.routes?.[0];
  if (!route) throw new HttpError(404, "No route found", "ROUTE_NOT_FOUND");
  res.json({ route: { geometry: route.geometry, distanceMeters: route.distance, durationSeconds: route.duration, mode: input.mode, destinationSnapshot: input.to } });
}));
