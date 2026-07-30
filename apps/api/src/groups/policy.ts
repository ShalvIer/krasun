import type { GroupJoinMode, GroupRole } from "@prisma/client";

export const canApproveMembers = (role: GroupRole) => role === "OWNER" || role === "ADMIN";
export const canRemoveRole = (actor: GroupRole, target: GroupRole) => actor === "OWNER" || (actor === "ADMIN" && target === "MEMBER");
export function joinOutcome(mode: GroupJoinMode, hasValidInvite: boolean): "JOIN" | "REQUEST" | "DENY" {
  if (mode === "OPEN") return "JOIN";
  if (mode === "APPROVAL_REQUIRED") return "REQUEST";
  return hasValidInvite ? "JOIN" : "DENY";
}
