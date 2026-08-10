import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/errors.js";
import { directConversationKey, serializeReactions } from "./policy.js";
import type { MessageView, UserSummary } from "@krasun/shared-types";
import { messageMediaPath } from "../uploads/paths.js";

export async function requireConversationAccess(userId: string, conversationId: string) {
  const participant = await prisma.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
  if (!participant) throw new HttpError(403, "Conversation access denied", "CONVERSATION_FORBIDDEN");
  return participant;
}

export async function getOrCreateDirectConversation(userId: string, otherUserId: string) {
  if (userId === otherUserId) throw new HttpError(400, "Choose another user");
  const commonGroup = await prisma.groupMember.findFirst({
    where: { userId, active: true, group: { members: { some: { userId: otherUserId, active: true } } } },
    select: { id: true }
  });
  if (!commonGroup) throw new HttpError(403, "Direct messages require a shared group", "NO_SHARED_GROUP");
  const key = directConversationKey(userId, otherUserId);
  return prisma.conversation.upsert({
    where: { directKey: key },
    update: {},
    create: { type: "DIRECT", directKey: key, participants: { create: [{ userId }, { userId: otherUserId }] } }
  });
}

export const messageInclude = {
  sender: true,
  attachments: true,
  replyTo: { include: { sender: true } },
  reactions: { select: { emoji: true, userId: true } }
} as const satisfies Prisma.MessageInclude;

type LoadedMessage = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

function serializeUser(user: LoadedMessage["sender"]): UserSummary | null {
  return user ? {
    id: user.id,
    username: user.username ?? "user",
    displayName: user.displayName ?? user.username ?? "Krasun user",
    profileAvatarPath: user.profileAvatarPath,
    lastSeenAt: user.lastSeenAt.toISOString()
  } : null;
}

export async function requireReplyTarget(conversationId: string, replyToId?: string | null) {
  if (!replyToId) return null;
  const target = await prisma.message.findFirst({
    where: { id: replyToId, conversationId, deletedAt: null },
    select: { id: true }
  });
  if (!target) throw new HttpError(400, "Reply target is not available in this conversation", "INVALID_REPLY_TARGET");
  return target.id;
}

export async function serializeMessage(message: LoadedMessage): Promise<MessageView> {
  let spotAvailable: boolean | undefined;
  if (message.type === "SPOT" && message.payload && typeof message.payload === "object" && !Array.isArray(message.payload)) {
    const spotId = Reflect.get(message.payload, "spotId");
    spotAvailable = typeof spotId === "string" && Boolean(await prisma.spot.findFirst({ where: { id: spotId, deletedAt: null }, select: { id: true } }));
  }
  const payload = message.payload && typeof message.payload === "object" && !Array.isArray(message.payload) ? { ...message.payload } as Record<string, unknown> : null;
  return {
    id: message.id,
    conversationId: message.conversationId,
    sender: serializeUser(message.sender),
    type: message.type,
    text: message.text,
    payload,
    attachments: message.attachments.map((item) => ({ id: item.id, mediaType: item.mediaType, originalName: item.originalName, url: messageMediaPath(item.id), mimeType: item.mimeType, sizeBytes: item.sizeBytes, duration: item.duration })),
    replyTo: message.replyTo ? {
      id: message.replyTo.id,
      sender: serializeUser(message.replyTo.sender),
      type: message.replyTo.type,
      text: message.replyTo.text,
      createdAt: message.replyTo.createdAt.toISOString()
    } : null,
    reactions: serializeReactions(message.reactions),
    createdAt: message.createdAt.toISOString(),
    ...(spotAvailable === undefined ? {} : { spotAvailable })
  };
}
