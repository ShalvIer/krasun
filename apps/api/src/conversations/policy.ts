export const directConversationKey = (firstUserId: string, secondUserId: string) => [firstUserId, secondUserId].sort().join(":");

export function spotMessageAvailable(messageType: string, payload: unknown, deletedSpotIds: Set<string>) {
  if (messageType !== "SPOT" || !payload || typeof payload !== "object") return true;
  const spotId = Reflect.get(payload, "spotId");
  return typeof spotId === "string" && !deletedSpotIds.has(spotId);
}
