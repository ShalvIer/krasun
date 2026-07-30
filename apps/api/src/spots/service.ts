import type { Prisma } from "@prisma/client";

export const spotInclude = { owner: true } as const satisfies Prisma.SpotInclude;
type LoadedSpot = Prisma.SpotGetPayload<{ include: typeof spotInclude }>;

export function serializeSpot(row: LoadedSpot) {
  return { id: row.id, ownerId: row.ownerId, owner: { id: row.owner.id, username: row.owner.username ?? "user", displayName: row.owner.displayName ?? row.owner.username ?? "Krasun user", profileAvatarPath: row.owner.profileAvatarPath, lastSeenAt: row.owner.lastSeenAt.toISOString() }, title: row.title, description: row.description, visibility: row.visibility, latitude: row.latitude, longitude: row.longitude, createdAt: row.createdAt.toISOString() };
}

export function accessibleSpotWhere(viewerId: string, ownerId?: string): Prisma.SpotWhereInput {
  return {
    deletedAt: null,
    ...(ownerId ? { ownerId } : {}),
    OR: [
      { ownerId: viewerId },
      { visibility: "PUBLIC", owner: { memberships: { some: { active: true, group: { members: { some: { userId: viewerId, active: true } } } } } } }
    ]
  };
}
