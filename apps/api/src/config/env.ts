import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  WEB_URL: z.string().url().default("http://localhost:5173"),
  WEB_DIST_DIR: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().default("http://127.0.0.1:54321"),
  SUPABASE_SECRET_KEY: z.string().default("development-supabase-secret"),
  SUPABASE_STORAGE_BUCKET: z.string().default("krasun-media"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  ACCESS_TOKEN_SECRET: z.string().min(32).default("development-access-secret-change-me-now"),
  REFRESH_TOKEN_SECRET: z.string().min(32).default("development-refresh-secret-change-me"),
  COOKIE_SECRET: z.string().min(32).default("development-cookie-secret-change-me!"),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  SESSION_IDLE_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  SESSION_ABSOLUTE_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  MAPBOX_SERVER_TOKEN: z.string().default(""),
  VAPID_PUBLIC_KEY: z.string().default(""),
  VAPID_PRIVATE_KEY: z.string().default(""),
  VAPID_SUBJECT: z.string().default("mailto:notifications@krasun.app"),
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().max(320).default(""),
  MAX_PHOTO_UPLOAD_BYTES: z.coerce.number().positive().default(10 * 1024 * 1024),
  MAX_AUDIO_UPLOAD_BYTES: z.coerce.number().positive().default(10 * 1024 * 1024),
  MAX_GIF_UPLOAD_BYTES: z.coerce.number().positive().default(5 * 1024 * 1024),
  MAX_VIDEO_UPLOAD_BYTES: z.coerce.number().positive().default(20 * 1024 * 1024),
  ENABLE_DEV_AUTH: z.string().default("false").transform((value) => value === "true")
});

const renderWebUrl = process.env.RENDER_EXTERNAL_HOSTNAME
  ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
  : undefined;

export const env = schema.parse({
  ...process.env,
  API_PORT: process.env.PORT ?? process.env.API_PORT,
  WEB_URL: process.env.WEB_URL ?? renderWebUrl
});
