import crypto from "node:crypto";
import path from "node:path";
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
import { supabase } from "../lib/supabase.js";
import { sendMessagePush } from "../push/service.js";

const allowedMime = /^(image\/(jpeg|png|webp|gif)|audio\/(webm|ogg|mpeg|mp4|wav)|video\/(webm|mp4))$/;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Math.max(env.MAX_PHOTO_UPLOAD_BYTES, env.MAX_AUDIO_UPLOAD_BYTES, env.MAX_GIF_UPLOAD_BYTES, env.MAX_VIDEO_UPLOAD_BYTES), files: 1 },
  fileFilter: (_req, file, callback) => allowedMime.test(file.mimetype)
    ? callback(null, true)
    : callback(new HttpError(415, "Unsupported media type", "UNSUPPORTED_MEDIA"))
});

function safeExtension(mime: string) {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
    "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mpeg": ".mp3", "audio/mp4": ".m4a", "audio/wav": ".wav",
    "video/webm": ".webm", "video/mp4": ".mp4"
  };
  return map[mime] ?? "";
}

async function storeFile(file: Express.Multer.File) {
  const storagePath = `${crypto.randomUUID()}${safeExtension(file.mimetype)}`;
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) {
    console.error("Supabase upload failed:", error.message);
    throw new HttpError(502, "Media storage is temporarily unavailable", "STORAGE_UPLOAD_FAILED");
  }
  return storagePath;
}

async function removeFile(storagePath: string) {
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([storagePath]);
  if (error) console.error("Supabase cleanup failed:", error.message);
}

async function sendStoredFile(storagePath: string, mimeType: string, res: Parameters<Parameters<typeof asyncRoute>[0]>[1]) {
  const { data, error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).download(storagePath);
  if (error || !data) {
    if (error) console.error("Supabase download failed:", error.message);
    throw new HttpError(404, "Media file not found");
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  res.type(mimeType);
  res.setHeader("Content-Length", String(buffer.length));
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(buffer);
}

export const uploadsRouter = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });

uploadsRouter.post("/message", limiter, upload.single("file"), asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  if (!req.file) throw new HttpError(400, "Choose a media file");
  const { conversationId, type } = z.object({ conversationId: z.string().uuid(), type: z.enum(["AUDIO", "PHOTO"]) }).parse(req.body);
  await requireConversationAccess(userId, conversationId);
  const limit = type === "AUDIO" ? env.MAX_AUDIO_UPLOAD_BYTES : req.file.mimetype === "image/gif" ? env.MAX_GIF_UPLOAD_BYTES : env.MAX_PHOTO_UPLOAD_BYTES;
  if (req.file.size > limit) throw new HttpError(413, `File exceeds the ${Math.round(limit / 1024 / 1024)} MB limit`, "FILE_TOO_LARGE");

  const storagePath = await storeFile(req.file);
  try {
    const row = await prisma.message.create({
      data: { conversationId, senderId: userId, type, attachments: { create: { mediaType: type.toLowerCase(), originalName: path.basename(req.file.originalname), storagePath, mimeType: req.file.mimetype, sizeBytes: req.file.size } } },
      include: messageInclude
    });
    const message = await serializeMessage(row);
    const io = getIo(req);
    io?.to(`conversation:${conversationId}`).emit("chat:message-created", message);
    const recipients = await prisma.conversationParticipant.findMany({ where: { conversationId, userId: { not: userId } }, select: { userId: true } });
    for (const recipient of recipients) io?.to(`user:${recipient.userId}`).emit("chat:message-created", message);
    void sendMessagePush({ conversationId, senderId: userId, type, text: null });
    res.status(201).json({ message });
  } catch (error) {
    await removeFile(storagePath);
    throw error;
  }
}));

uploadsRouter.post("/avatar", limiter, upload.single("file"), asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  if (!req.file) throw new HttpError(400, "Choose an avatar file");
  const type = req.file.mimetype === "image/gif" ? "GIF" : req.file.mimetype.startsWith("video/") ? "VIDEO" : "PHOTO";
  const limit = type === "GIF" ? env.MAX_GIF_UPLOAD_BYTES : type === "VIDEO" ? env.MAX_VIDEO_UPLOAD_BYTES : env.MAX_PHOTO_UPLOAD_BYTES;
  if (req.file.size > limit) throw new HttpError(413, "Avatar file is too large", "FILE_TOO_LARGE");

  const previous = await prisma.mapAvatar.findUnique({ where: { userId } });
  const storagePath = await storeFile(req.file);
  try {
    const avatar = await prisma.mapAvatar.upsert({
      where: { userId },
      update: { type, value: `/api/uploads/avatar/${storagePath}`, storagePath },
      create: { userId, type, value: `/api/uploads/avatar/${storagePath}`, storagePath }
    });
    if (previous?.storagePath && previous.storagePath !== storagePath) await removeFile(previous.storagePath);
    res.status(201).json({ avatar });
  } catch (error) {
    await removeFile(storagePath);
    throw error;
  }
}));

uploadsRouter.get("/media/:attachmentId", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const attachment = await prisma.messageAttachment.findUnique({ where: { id: routeParam(req, "attachmentId") }, include: { message: true } });
  if (!attachment) throw new HttpError(404, "Media not found");
  await requireConversationAccess(userId, attachment.message.conversationId);
  await sendStoredFile(attachment.storagePath, attachment.mimeType, res);
}));

uploadsRouter.get("/avatar/:filename", asyncRoute(async (req, res) => {
  const viewerId = requireUserId(req);
  const storagePath = routeParam(req, "filename");
  const avatar = await prisma.mapAvatar.findFirst({ where: { storagePath }, include: { user: true } });
  if (!avatar?.storagePath) throw new HttpError(404, "Avatar not found");
  const visible = avatar.userId === viewerId || Boolean(await prisma.groupMember.findFirst({ where: { userId: viewerId, active: true, group: { members: { some: { userId: avatar.userId, active: true } } } } }));
  if (!visible) throw new HttpError(403, "Avatar access denied");
  const mimeType = avatar.type === "GIF" ? "image/gif" : avatar.type === "VIDEO" ? storagePath.endsWith(".webm") ? "video/webm" : "video/mp4" : storagePath.endsWith(".png") ? "image/png" : storagePath.endsWith(".webp") ? "image/webp" : "image/jpeg";
  await sendStoredFile(avatar.storagePath, mimeType, res);
}));
