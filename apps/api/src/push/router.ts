import { Router } from "express";
import { z } from "zod";
import { asyncRoute } from "../lib/errors.js";
import { requireUserId } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { pushEnabled } from "./service.js";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(4096),
  keys: z.object({
    p256dh: z.string().min(16).max(512),
    auth: z.string().min(8).max(256)
  })
});

export const pushRouter = Router();

pushRouter.get("/public-key", (_req, res) => {
  res.json({ supported: pushEnabled, publicKey: pushEnabled ? process.env.VAPID_PUBLIC_KEY : null });
});

pushRouter.get("/status", asyncRoute(async (req, res) => {
  const subscriptions = await prisma.pushSubscription.count({ where: { userId: requireUserId(req) } });
  res.json({ configured: pushEnabled, subscribed: subscriptions > 0, devices: subscriptions });
}));

pushRouter.post("/subscribe", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const subscription = subscriptionSchema.parse(req.body);
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent: req.get("user-agent") ?? null },
    create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, userAgent: req.get("user-agent") ?? null }
  });
  res.status(201).json({ subscribed: true });
}));

pushRouter.delete("/subscribe", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const { endpoint } = z.object({ endpoint: z.string().url().max(4096) }).parse(req.body);
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  res.status(204).end();
}));
