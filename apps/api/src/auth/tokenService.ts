import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

interface AccessClaims { sub: string; type: "access"; }
interface RefreshClaims { sub: string; sid: string; type: "refresh"; }

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const randomToken = () => crypto.randomBytes(32).toString("hex");
export const signAccessToken = (userId: string) => jwt.sign({ sub: userId, type: "access" } satisfies AccessClaims, env.ACCESS_TOKEN_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60 });
export const signRefreshToken = (userId: string, sessionId: string) => jwt.sign({ sub: userId, sid: sessionId, type: "refresh" } satisfies RefreshClaims, env.REFRESH_TOKEN_SECRET, { expiresIn: env.SESSION_ABSOLUTE_DAYS * 24 * 60 * 60 });
export const verifyAccessToken = (token: string) => jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AccessClaims;
export const verifyRefreshToken = (token: string) => jwt.verify(token, env.REFRESH_TOKEN_SECRET) as RefreshClaims;
