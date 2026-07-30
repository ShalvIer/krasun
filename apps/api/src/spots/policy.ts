export function canViewSpot(input: { visibility: "PUBLIC" | "PRIVATE"; ownerId: string }, viewerId: string, hasCommonGroup: boolean) {
  return input.ownerId === viewerId || (input.visibility === "PUBLIC" && hasCommonGroup);
}
