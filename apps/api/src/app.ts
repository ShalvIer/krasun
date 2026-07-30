import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./lib/errors.js";
import { requireAuth } from "./middleware/auth.js";
import { authRouter } from "./auth/router.js";
import { groupsRouter } from "./groups/router.js";
import { conversationsRouter } from "./conversations/router.js";
import { uploadsRouter } from "./uploads/router.js";
import { spotsRouter } from "./spots/router.js";
import { profilesRouter } from "./profiles/router.js";
import { mapRouter } from "./map/router.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.WEB_URL, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.get("/health", (_req, res) => res.json({ ok: true, name: "krasun-api" }));
  app.use("/api/auth", authRouter);
  app.use("/api/groups", requireAuth, groupsRouter);
  app.use("/api/conversations", requireAuth, conversationsRouter);
  app.use("/api/uploads", requireAuth, uploadsRouter);
  app.use("/api/spots", requireAuth, spotsRouter);
  app.use("/api/profiles", requireAuth, profilesRouter);
  app.use("/api/map", requireAuth, mapRouter);
  app.use(errorHandler);
  return app;
}
