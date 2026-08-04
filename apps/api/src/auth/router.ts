import crypto from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { onboardingSchema } from "@krasun/shared-validation";
import { authenticateGoogle } from "./authService.js";
import { GoogleIdTokenVerifier } from "./googleVerifier.js";
import { issueSession, REFRESH_COOKIE, refreshSession, revokeSession, toSessionUser } from "./sessionService.js";
import { asyncRoute, HttpError } from "../lib/errors.js";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireUserId } from "../middleware/auth.js";
import { hashToken, randomToken } from "./tokenService.js";
import { usernameIsAvailable } from "./authService.js";

export const authRouter = Router();
const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

authRouter.post("/google", authLimiter, asyncRoute(async (req, res) => {
  const { credential } = z.object({ credential: z.string().min(20) }).parse(req.body);
  const user = await authenticateGoogle(credential, new GoogleIdTokenVerifier());
  res.json(await issueSession(user, res));
}));

authRouter.post("/dev", authLimiter, asyncRoute(async (req, res) => {
  if (!env.ENABLE_DEV_AUTH || env.NODE_ENV === "production") throw new HttpError(404, "Not found");
  const { email, name } = z.object({ email: z.string().email(), name: z.string().min(1).max(60) }).parse(req.body);
  const user = await prisma.user.upsert({ where: { primaryEmail: email.toLowerCase() }, update: { displayName: name }, create: { primaryEmail: email.toLowerCase(), displayName: name } });
  res.json(await issueSession(user, res));
}));

authRouter.post("/refresh", asyncRoute(async (req, res) => res.json(await refreshSession(req.cookies?.[REFRESH_COOKIE] as string | undefined, res))));
authRouter.post("/logout", asyncRoute(async (req, res) => { await revokeSession(req.cookies?.[REFRESH_COOKIE] as string | undefined, res); res.status(204).end(); }));

authRouter.get("/me", requireAuth, asyncRoute(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: requireUserId(req) } });
  res.json({ user: toSessionUser(user) });
}));

authRouter.post("/onboarding", requireAuth, asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const input = onboardingSchema.parse(req.body);
  const available = await usernameIsAvailable(userId, input.username, (username) => prisma.user.findUnique({ where: { username }, select: { id: true } }));
  if (!available) throw new HttpError(409, "Username is already taken", "USERNAME_TAKEN");
  const user = await prisma.user.update({ where: { id: userId }, data: { username: input.username, displayName: input.displayName || input.username, onboardingCompleted: true, alternateEmail: input.alternateEmail || null, alternateEmailVerifiedAt: null } });
  res.json({ user: toSessionUser(user) });
}));

authRouter.post("/alternate-email", requireAuth, asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const token = randomToken();
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { alternateEmail: email.toLowerCase(), alternateEmailVerifiedAt: null } }),
    prisma.emailVerificationToken.create({ data: { id: crypto.randomUUID(), userId, email: email.toLowerCase(), tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) } })
  ]);
  const verificationUrl = `${env.WEB_URL}/api/auth/verify-email?token=${token}`;
  if (env.NODE_ENV !== "production") console.info(`[Krasun dev mail] Verify alternate email: ${verificationUrl}`);
  res.status(202).json({ message: "Verification email prepared", ...(env.NODE_ENV !== "production" ? { verificationUrl } : {}) });
}));

authRouter.get("/verify-email", asyncRoute(async (req, res) => {
  const token = z.string().min(20).parse(req.query.token);
  const row = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt <= new Date()) throw new HttpError(400, "Verification link expired or invalid", "INVALID_EMAIL_TOKEN");
  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: row.userId }, data: { alternateEmail: row.email, alternateEmailVerifiedAt: new Date() } })
  ]);
  res.type("html").send("<h1>Krasun email verified</h1><p>You can close this tab.</p>");
}));
