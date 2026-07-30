import type { SpotView } from "@krasun/shared-types";

export function publicSpotsForUser(spots: SpotView[], userId: string) {
  return spots.filter((spot) => spot.ownerId === userId && spot.visibility === "PUBLIC");
}

export function spotsBounds(spots: SpotView[]) {
  if (!spots.length) return null;
  return spots.reduce((bounds, spot) => ({
    west: Math.min(bounds.west, spot.longitude), south: Math.min(bounds.south, spot.latitude),
    east: Math.max(bounds.east, spot.longitude), north: Math.max(bounds.north, spot.latitude)
  }), { west: spots[0]!.longitude, south: spots[0]!.latitude, east: spots[0]!.longitude, north: spots[0]!.latitude });
}
