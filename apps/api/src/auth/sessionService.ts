import crypto from "node:crypto";
import type { Response } from "express";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from "./tokenService.js";
import { HttpError } from "../lib/errors.js";

export const REFRESH_COOKIE = "krasun_refresh";
const absoluteSessionMs = () => env.SESSION_ABSOLUTE_DAYS * 24 * 60 * 60 * 1000;
const idleSessionMs = () => env.SESSION_IDLE_HOURS * 60 * 60 * 1000;

function cookieOptions() {
  return { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/auth", maxAge: absoluteSessionMs() };
}

export async function issueSession(user: User, res: Response) {
  const sessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken(user.id, sessionId);
  await prisma.refreshSession.create({ data: { id: sessionId, userId: user.id, tokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + absoluteSessionMs()), lastUsedAt: new Date() } });
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions());
  return { accessToken: signAccessToken(user.id), user: toSessionUser(user) };
}

export async function refreshSession(token: string | undefined, res: Response) {
  if (!token) throw new HttpError(401, "Refresh session missing", "NO_REFRESH_SESSION");
  let claims;
  try { claims = verifyRefreshToken(token); }
  catch { throw new HttpError(401, "Refresh session expired or invalid", "INVALID_REFRESH_SESSION"); }
  const session = await prisma.refreshSession.findUnique({ where: { id: claims.sid }, include: { user: true } });
  if (!session || session.userId !== claims.sub || session.revokedAt || session.expiresAt <= new Date() || session.lastUsedAt <= new Date(Date.now() - idleSessionMs()) || session.tokenHash !== hashToken(token)) {
    throw new HttpError(401, "Refresh session expired or revoked", "INVALID_REFRESH_SESSION");
  }
  const next = signRefreshToken(session.userId, session.id);
  await prisma.refreshSession.update({ where: { id: session.id }, data: { tokenHash: hashToken(next), lastUsedAt: new Date() } });
  res.cookie(REFRESH_COOKIE, next, cookieOptions());
  return { accessToken: signAccessToken(session.userId), user: toSessionUser(session.user) };
}

export async function revokeSession(token: string | undefined, res: Response) {
  if (token) {
    try { const claims = verifyRefreshToken(token); await prisma.refreshSession.updateMany({ where: { id: claims.sid, userId: claims.sub }, data: { revokedAt: new Date() } }); }
    catch { /* An invalid cookie is cleared without exposing token details. */ }
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
}

export function toSessionUser(user: User) {
  return { id: user.id, username: user.username, displayName: user.displayName, primaryEmail: user.primaryEmail, profileAvatarPath: user.profileAvatarPath, onboardingCompleted: user.onboardingCompleted };
}
