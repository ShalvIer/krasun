import type { MessageReactionView } from "@krasun/shared-types";

export const directConversationKey = (firstUserId: string, secondUserId: string) => [firstUserId, secondUserId].sort().join(":");

export function spotMessageAvailable(messageType: string, payload: unknown, deletedSpotIds: Set<string>) {
  if (messageType !== "SPOT" || !payload || typeof payload !== "object") return true;
  const spotId = Reflect.get(payload, "spotId");
  return typeof spotId === "string" && !deletedSpotIds.has(spotId);
}

export function serializeReactions(reactions: Array<{ emoji: string; userId: string }>): MessageReactionView[] {
  const grouped = new Map<string, string[]>();
  for (const reaction of reactions) {
    const users = grouped.get(reaction.emoji) ?? [];
    if (!users.includes(reaction.userId)) users.push(reaction.userId);
    grouped.set(reaction.emoji, users);
  }
  return Array.from(grouped, ([emoji, userIds]) => ({ emoji, count: userIds.length, userIds }));
}
