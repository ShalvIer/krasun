import { z } from "zod";

export const usernameSchema = z.string().trim().toLowerCase().min(3).max(24).regex(/^[a-z0-9_]+$/, "Use letters, numbers and underscores only");
export const onboardingSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(60).optional(),
  alternateEmail: z.string().email().optional().or(z.literal(""))
});
export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().max(100_000).optional(),
  timestamp: z.number().int().positive().optional()
});
export const groupCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  joinMode: z.enum(["OPEN", "APPROVAL_REQUIRED", "INVITE_ONLY"]).default("OPEN")
});
export const textMessageSchema = z.object({ conversationId: z.string().uuid(), text: z.string().trim().min(1).max(4000) });
export const structuredMessageSchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(["SPOT", "LOCATION"]),
  payload: z.record(z.unknown())
});
export const statusSchema = z.object({
  text: z.string().trim().min(1).max(140),
  emoji: z.string().trim().max(8).optional(),
  durationHours: z.union([z.literal(1), z.literal(6), z.literal(24), z.literal(72), z.literal(120)])
});
export const spotInputSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).default(""),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});
export const avatarSchema = z.object({ type: z.enum(["DEFAULT", "EMOJI", "PHOTO", "GIF", "VIDEO"]), value: z.string().max(2048).nullable().optional() });
export const routeSchema = z.object({
  from: coordinateSchema.pick({ latitude: true, longitude: true }),
  to: coordinateSchema.pick({ latitude: true, longitude: true }),
  mode: z.enum(["WALKING", "DRIVING"])
});
