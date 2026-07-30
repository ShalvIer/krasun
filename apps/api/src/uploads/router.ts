import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { env } from "../config/env.js";
import { asyncRoute, HttpError, routeParam } from "../lib/errors.js";
import { requireUserId } from "../middleware/auth.js";
import { messageInclude, requireConversationAccess, serializeMessage } from "../conversations/service.js";
import { prisma } from "../lib/prisma.js";
import { getIo } from "../sockets/helpers.js";

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
const allowedMime = /^(image\/(jpeg|png|webp|gif)|audio\/(webm|ogg|mpeg|mp4|wav)|video\/(webm|mp4))$/;
const upload = multer({
  storage: multer.diskStorage({ destination: env.UPLOAD_DIR, filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${safeExtension(file.mimetype)}`) }),
  limits: { fileSize: Math.max(env.MAX_PHOTO_UPLOAD_BYTES, env.MAX_AUDIO_UPLOAD_BYTES, env.MAX_GIF_UPLOAD_BYTES, env.MAX_VIDEO_UPLOAD_BYTES), files: 1 },
  fileFilter: (_req, file, callback) => allowedMime.test(file.mimetype) ? callback(null, true) : callback(new HttpError(415, "Unsupported media type", "UNSUPPORTED_MEDIA"))
});

function safeExtension(mime: string) {
  const map: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif", "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/wav": ".wav", "video/webm": ".webm", "video/mp4": ".mp4" };
  return map[mime] ?? "";
}

export const uploadsRouter = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });

uploadsRouter.post("/message", limiter, upload.single("file"), asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  if (!req.file) throw new HttpError(400, "Choose a media file");
  const { conversationId, type } = z.object({ conversationId: z.string().uuid(), type: z.enum(["AUDIO", "PHOTO"]) }).parse(req.body);
  await requireConversationAccess(userId, conversationId);
  const limit = type === "AUDIO" ? env.MAX_AUDIO_UPLOAD_BYTES : req.file.mimetype === "image/gif" ? env.MAX_GIF_UPLOAD_BYTES : env.MAX_PHOTO_UPLOAD_BYTES;
  if (req.file.size > limit) { fs.unlinkSync(req.file.path); throw new HttpError(413, `File exceeds the ${Math.round(limit / 1024 / 1024)} MB limit`, "FILE_TOO_LARGE"); }
  const row = await prisma.message.create({
    data: { conversationId, senderId: userId, type, attachments: { create: { mediaType: type.toLowerCase(), originalName: path.basename(req.file.originalname), storagePath: req.file.filename, mimeType: req.file.mimetype, sizeBytes: req.file.size } } },
    include: messageInclude
  });
  const message = await serializeMessage(row);
  getIo(req)?.to(`conversation:${conversationId}`).emit("chat:message-created", message);
  res.status(201).json({ message });
}));

uploadsRouter.post("/avatar", limiter, upload.single("file"), asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  if (!req.file) throw new HttpError(400, "Choose an avatar file");
  const type = req.file.mimetype === "image/gif" ? "GIF" : req.file.mimetype.startsWith("video/") ? "VIDEO" : "PHOTO";
  const limit = type === "GIF" ? env.MAX_GIF_UPLOAD_BYTES : type === "VIDEO" ? env.MAX_VIDEO_UPLOAD_BYTES : env.MAX_PHOTO_UPLOAD_BYTES;
  if (req.file.size > limit) { fs.unlinkSync(req.file.path); throw new HttpError(413, "Avatar file is too large", "FILE_TOO_LARGE"); }
  const avatar = await prisma.mapAvatar.upsert({ where: { userId }, update: { type, value: `/api/uploads/avatar/${req.file.filename}`, storagePath: req.file.filename }, create: { userId, type, value: `/api/uploads/avatar/${req.file.filename}`, storagePath: req.file.filename } });
  res.status(201).json({ avatar });
}));

uploadsRouter.get("/media/:attachmentId", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const attachment = await prisma.messageAttachment.findUnique({ where: { id: routeParam(req, "attachmentId") }, include: { message: true } });
  if (!attachment) throw new HttpError(404, "Media not found");
  await requireConversationAccess(userId, attachment.message.conversationId);
  res.type(attachment.mimeType).sendFile(path.resolve(env.UPLOAD_DIR, attachment.storagePath));
}));

uploadsRouter.get("/avatar/:filename", asyncRoute(async (req, res) => {
  const viewerId = requireUserId(req);
  const avatar = await prisma.mapAvatar.findFirst({ where: { storagePath: routeParam(req, "filename") }, include: { user: true } });
  if (!avatar?.storagePath) throw new HttpError(404, "Avatar not found");
  const visible = avatar.userId === viewerId || Boolean(await prisma.groupMember.findFirst({ where: { userId: viewerId, active: true, group: { members: { some: { userId: avatar.userId, active: true } } } } }));
  if (!visible) throw new HttpError(403, "Avatar access denied");
  res.sendFile(path.resolve(env.UPLOAD_DIR, avatar.storagePath));
}));
