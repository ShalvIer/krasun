import crypto from "node:crypto";
import { GroupRole, type GroupJoinMode } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../lib/errors.js";
import { joinOutcome } from "./policy.js";

export const createInviteCode = () => crypto.randomBytes(5).toString("base64url").toUpperCase();

export async function requireMembership(userId: string, groupId: string) {
  const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!membership?.active) throw new HttpError(403, "Active group membership required", "GROUP_FORBIDDEN");
  return membership;
}

export async function createGroup(userId: string, input: { name: string; description?: string; joinMode: GroupJoinMode }) {
  return prisma.$transaction(async (tx) => {
    const group = await tx.group.create({ data: { name: input.name, description: input.description || null, joinMode: input.joinMode, ownerId: userId, inviteCode: createInviteCode() } });
    await tx.groupMember.create({ data: { groupId: group.id, userId, role: GroupRole.OWNER } });
    const conversation = await tx.conversation.create({ data: { type: "GROUP", groupId: group.id, title: group.name, participants: { create: { userId } } } });
    return { ...group, primaryConversationId: conversation.id };
  });
}

export async function joinGroup(userId: string, code: string) {
  const group = await prisma.group.findFirst({ where: { OR: [{ inviteCode: code }, { invites: { some: { code, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } } }] }, include: { conversation: true } });
  if (!group) throw new HttpError(404, "Invite code not found", "INVITE_NOT_FOUND");
  const outcome = joinOutcome(group.joinMode, true);
  if (outcome === "DENY") throw new HttpError(403, "A valid invite is required", "INVITE_REQUIRED");
  if (outcome === "REQUEST") {
    const request = await prisma.groupJoinRequest.upsert({ where: { groupId_userId: { groupId: group.id, userId } }, update: { status: "PENDING", reviewedAt: null, reviewedById: null }, create: { groupId: group.id, userId } });
    return { state: "PENDING" as const, request };
  }
  await prisma.$transaction([
    prisma.groupMember.upsert({ where: { groupId_userId: { groupId: group.id, userId } }, update: { active: true, role: "MEMBER" }, create: { groupId: group.id, userId, role: "MEMBER" } }),
    ...(group.conversation ? [prisma.conversationParticipant.upsert({ where: { conversationId_userId: { conversationId: group.conversation.id, userId } }, update: {}, create: { conversationId: group.conversation.id, userId } })] : [])
  ]);
  return { state: "JOINED" as const, group };
}
