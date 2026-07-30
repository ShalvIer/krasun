import { Router } from "express";
import { z } from "zod";
import { structuredMessageSchema } from "@krasun/shared-validation";
import { asyncRoute, routeParam } from "../lib/errors.js";
import { requireUserId } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { getOrCreateDirectConversation, messageInclude, requireConversationAccess, serializeMessage } from "./service.js";
import { getIo } from "../sockets/helpers.js";
import type { Prisma } from "@prisma/client";

export const conversationsRouter = Router();

conversationsRouter.get("/", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const links = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: { conversation: { include: { group: true, participants: { include: { user: true } }, messages: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1, include: messageInclude } } } },
    orderBy: { conversation: { updatedAt: "desc" } }
  });
  const conversations = await Promise.all(links.map(async ({ conversation }) => ({
    id: conversation.id,
    type: conversation.type,
    title: conversation.type === "GROUP" ? conversation.group?.name ?? conversation.title ?? "Group" : conversation.participants.find((item) => item.userId !== userId)?.user.displayName ?? "Direct message",
    groupId: conversation.groupId,
    participants: conversation.participants.map(({ user }) => ({ id: user.id, username: user.username ?? "user", displayName: user.displayName ?? user.username ?? "Krasun user", profileAvatarPath: user.profileAvatarPath, lastSeenAt: user.lastSeenAt.toISOString() })),
    lastMessage: conversation.messages[0] ? await serializeMessage(conversation.messages[0]) : null
  })));
  res.json({ conversations });
}));

conversationsRouter.post("/direct", asyncRoute(async (req, res) => {
  const { userId: otherUserId } = z.object({ userId: z.string().uuid() }).parse(req.body);
  res.json({ conversation: await getOrCreateDirectConversation(requireUserId(req), otherUserId) });
}));

conversationsRouter.get("/:conversationId/messages", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const conversationId = routeParam(req, "conversationId");
  await requireConversationAccess(userId, conversationId);
  const before = typeof req.query.before === "string" ? new Date(req.query.before) : undefined;
  const rows = await prisma.message.findMany({
    where: { conversationId, deletedAt: null, ...(before ? { createdAt: { lt: before } } : {}) },
    orderBy: { createdAt: "desc" }, take: 50, include: messageInclude
  });
  res.json({ messages: await Promise.all(rows.reverse().map(serializeMessage)), nextCursor: rows.length === 50 ? rows[0]?.createdAt.toISOString() : null });
}));

conversationsRouter.post("/:conversationId/messages", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const conversationId = routeParam(req, "conversationId");
  await requireConversationAccess(userId, conversationId);
  const parsed = z.discriminatedUnion("type", [
    z.object({ type: z.literal("TEXT"), text: z.string().trim().min(1).max(4000) }),
    structuredMessageSchema.omit({ conversationId: true })
  ]).parse(req.body);
  const row = await prisma.message.create({ data: { conversationId, senderId: userId, type: parsed.type, text: parsed.type === "TEXT" ? parsed.text : null, payload: parsed.type === "TEXT" ? undefined : parsed.payload as Prisma.InputJsonValue }, include: messageInclude });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  const message = await serializeMessage(row);
  getIo(req)?.to(`conversation:${conversationId}`).emit("chat:message-created", message);
  res.status(201).json({ message });
}));
