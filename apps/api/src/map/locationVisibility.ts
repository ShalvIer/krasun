type StoredLocation = {
  state: string;
  [key: string]: unknown;
};

export function locationForMapViewer<T extends StoredLocation>(
  viewerId: string,
  ownerId: string,
  location: T | null,
): T | { state: "HIDDEN" } | null {
  if (!location || viewerId === ownerId || location.state !== "HIDDEN") return location;
  return { state: "HIDDEN" };
}
