import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/errors.js";
import { verifyAccessToken } from "../auth/tokenService.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return next(new HttpError(401, "Authentication required", "AUTH_REQUIRED"));
  try { req.userId = verifyAccessToken(token).sub; return next(); }
  catch { return next(new HttpError(401, "Access token expired or invalid", "INVALID_ACCESS_TOKEN")); }
}

export function requireUserId(req: Request) {
  if (!req.userId) throw new HttpError(401, "Authentication required", "AUTH_REQUIRED");
  return req.userId;
}
