import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
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
import { pushRouter } from "./push/router.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  if (env.NODE_ENV === "production") app.set("trust proxy", 1);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://accounts.google.com"],
        connectSrc: [
          "'self'",
          "https://accounts.google.com",
          "https://api.mapbox.com",
          "https://events.mapbox.com",
          "https://*.tiles.mapbox.com",
          "wss:"
        ],
        imgSrc: ["'self'", "data:", "blob:", "https://*.mapbox.com", "https://*.googleusercontent.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
        fontSrc: ["'self'", "data:"],
        mediaSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        frameSrc: ["https://accounts.google.com"],
        objectSrc: ["'none'"]
      }
    }
  }));
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
  app.use("/api/push", requireAuth, pushRouter);
  if (env.WEB_DIST_DIR) {
    const webRoot = path.resolve(env.WEB_DIST_DIR);
    const indexFile = path.join(webRoot, "index.html");
    if (!fs.existsSync(indexFile)) throw new Error(`Web build not found at ${indexFile}`);
    app.use(express.static(webRoot, { index: false, maxAge: env.NODE_ENV === "production" ? "7d" : 0 }));
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.startsWith("/socket.io/")) return next();
      res.sendFile(indexFile);
    });
  }
  app.use(errorHandler);
  return app;
}
