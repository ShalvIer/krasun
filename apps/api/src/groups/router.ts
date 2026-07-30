import { Router } from "express";
import { z } from "zod";
import { groupCreateSchema } from "@krasun/shared-validation";
import { asyncRoute, HttpError, routeParam } from "../lib/errors.js";
import { requireUserId } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { canApproveMembers } from "./policy.js";
import { createGroup, createInviteCode, joinGroup, requireMembership } from "./service.js";

export const groupsRouter = Router();

groupsRouter.get("/", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const rows = await prisma.groupMember.findMany({ where: { userId, active: true }, include: { group: { include: { conversation: true, _count: { select: { members: { where: { active: true } } } } } } }, orderBy: { joinedAt: "desc" } });
  res.json({ groups: rows.map(({ role, group }) => ({ id: group.id, name: group.name, description: group.description, avatarPath: group.avatarPath, inviteCode: group.inviteCode, joinMode: group.joinMode, role, primaryConversationId: group.conversation?.id ?? null, memberCount: group._count.members })) });
}));

groupsRouter.post("/", asyncRoute(async (req, res) => res.status(201).json({ group: await createGroup(requireUserId(req), groupCreateSchema.parse(req.body)) })));

groupsRouter.post("/join", asyncRoute(async (req, res) => {
  const { code } = z.object({ code: z.string().trim().min(4).max(32) }).parse(req.body);
  res.json(await joinGroup(requireUserId(req), code.toUpperCase()));
}));

groupsRouter.get("/:groupId/members", asyncRoute(async (req, res) => {
  const groupId = routeParam(req, "groupId");
  await requireMembership(requireUserId(req), groupId);
  const members = await prisma.groupMember.findMany({ where: { groupId, active: true }, include: { user: { include: { location: true, mapAvatar: true, status: true } } }, orderBy: [{ role: "asc" }, { joinedAt: "asc" }] });
  res.json({ members: members.map((row) => ({ role: row.role, user: { ...row.user, status: row.user.status?.expiresAt && row.user.status.expiresAt > new Date() ? row.user.status : null } })) });
}));

groupsRouter.get("/:groupId/requests", asyncRoute(async (req, res) => {
  const groupId = routeParam(req, "groupId");
  const membership = await requireMembership(requireUserId(req), groupId);
  if (!canApproveMembers(membership.role)) throw new HttpError(403, "Admin role required", "ROLE_FORBIDDEN");
  const requests = await prisma.groupJoinRequest.findMany({ where: { groupId, status: "PENDING" }, include: { user: true }, orderBy: { createdAt: "asc" } });
  res.json({ requests });
}));

groupsRouter.post("/:groupId/requests/:requestId/:action", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const groupId = routeParam(req, "groupId");
  const requestId = routeParam(req, "requestId");
  const membership = await requireMembership(userId, groupId);
  if (!canApproveMembers(membership.role)) throw new HttpError(403, "Admin role required", "ROLE_FORBIDDEN");
  const action = z.enum(["approve", "reject"]).parse(req.params.action);
  const request = await prisma.groupJoinRequest.findFirst({ where: { id: requestId, groupId, status: "PENDING" } });
  if (!request) throw new HttpError(404, "Join request not found");
  await prisma.$transaction(async (tx) => {
    await tx.groupJoinRequest.update({ where: { id: request.id }, data: { status: action === "approve" ? "APPROVED" : "REJECTED", reviewedById: userId, reviewedAt: new Date() } });
    if (action === "approve") {
      await tx.groupMember.upsert({ where: { groupId_userId: { groupId: request.groupId, userId: request.userId } }, update: { active: true, role: "MEMBER" }, create: { groupId: request.groupId, userId: request.userId, role: "MEMBER" } });
      const conversation = await tx.conversation.findUnique({ where: { groupId: request.groupId } });
      if (conversation) await tx.conversationParticipant.upsert({ where: { conversationId_userId: { conversationId: conversation.id, userId: request.userId } }, update: {}, create: { conversationId: conversation.id, userId: request.userId } });
    }
  });
  res.json({ state: action === "approve" ? "APPROVED" : "REJECTED" });
}));

groupsRouter.post("/:groupId/invite/regenerate", asyncRoute(async (req, res) => {
  const userId = requireUserId(req);
  const groupId = routeParam(req, "groupId");
  const membership = await requireMembership(userId, groupId);
  if (membership.role !== "OWNER") throw new HttpError(403, "Only the owner can regenerate the invite", "ROLE_FORBIDDEN");
  const group = await prisma.group.update({ where: { id: groupId }, data: { inviteCode: createInviteCode() } });
  res.json({ inviteCode: group.inviteCode });
}));
