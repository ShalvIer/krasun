import { Router } from "express";
import { spotInputSchema } from "@krasun/shared-validation";
import { asyncRoute, HttpError, routeParam } from "../lib/errors.js";
import { requireUserId } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { accessibleSpotWhere, serializeSpot, spotInclude } from "./service.js";

export const spotsRouter = Router();

spotsRouter.get("/", asyncRoute(async (req, res) => {
  const rows = await prisma.spot.findMany({ where: accessibleSpotWhere(requireUserId(req), typeof req.query.ownerId === "string" ? req.query.ownerId : undefined), include: spotInclude, orderBy: { createdAt: "desc" } });
  res.json({ spots: rows.map(serializeSpot) });
}));

spotsRouter.post("/", asyncRoute(async (req, res) => {
  const row = await prisma.spot.create({ data: { ...spotInputSchema.parse(req.body), ownerId: requireUserId(req) }, include: spotInclude });
  res.status(201).json({ spot: serializeSpot(row) });
}));

spotsRouter.patch("/:spotId", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const current = await prisma.spot.findFirst({ where: { id: routeParam(req, "spotId"), ownerId: userId, deletedAt: null } });
  if (!current) throw new HttpError(404, "Spot not found or not owned by you", "SPOT_FORBIDDEN");
  const row = await prisma.spot.update({ where: { id: current.id }, data: spotInputSchema.partial().parse(req.body), include: spotInclude });
  res.json({ spot: serializeSpot(row) });
}));

spotsRouter.delete("/:spotId", asyncRoute(async (req, res) => {
  const result = await prisma.spot.updateMany({ where: { id: routeParam(req, "spotId"), ownerId: requireUserId(req), deletedAt: null }, data: { deletedAt: new Date() } });
  if (!result.count) throw new HttpError(404, "Spot not found or not owned by you", "SPOT_FORBIDDEN");
  res.status(204).end();
}));

spotsRouter.get("/user/:userId/public", asyncRoute(async (req, res) => {
  const rows = await prisma.spot.findMany({ where: accessibleSpotWhere(requireUserId(req), routeParam(req, "userId")), include: spotInclude, orderBy: { createdAt: "desc" } });
  res.json({ spots: rows.filter((row) => row.visibility === "PUBLIC" || row.ownerId === requireUserId(req)).map(serializeSpot) });
}));
