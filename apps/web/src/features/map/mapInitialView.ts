import type { Coordinates } from "@krasun/shared-types";

export const DEFAULT_MAP_CENTER: Coordinates = {
  latitude: 43.6629,
  longitude: -79.3957,
};

type LocatedUser = {
  id: string;
  location?: Coordinates | null;
};

export function coordinatesFromSearch(search: Pick<URLSearchParams, "get">): Coordinates | null {
  const latitudeValue = search.get("lat");
  const longitudeValue = search.get("lng");

  if (!latitudeValue?.trim() || !longitudeValue?.trim()) return null;

  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);

  if (
    !Number.isFinite(latitude)
    || !Number.isFinite(longitude)
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) return null;

  return { latitude, longitude };
}

export function ownMapLocation(
  users: LocatedUser[],
  userId: string | undefined,
  currentLocation: Coordinates | null,
): Coordinates | null {
  if (currentLocation) return currentLocation;
  if (!userId) return null;
  return users.find((user) => user.id === userId)?.location ?? null;
}
