import { describe, expect, it } from "vitest";
import { publicSpotsForUser, spotsBounds } from "./mapActions";
import type { SpotView } from "@krasun/shared-types";

const owner = { id: "u1", username: "alice", displayName: "Alice", profileAvatarPath: null, lastSeenAt: new Date().toISOString() };
const spots: SpotView[] = [
  { id: "s1", ownerId: "u1", owner, title: "A", description: "", visibility: "PUBLIC", latitude: 43, longitude: -79, createdAt: "" },
  { id: "s2", ownerId: "u1", owner, title: "B", description: "", visibility: "PRIVATE", latitude: 44, longitude: -80, createdAt: "" },
  { id: "s3", ownerId: "u2", owner: { ...owner, id: "u2" }, title: "C", description: "", visibility: "PUBLIC", latitude: 42, longitude: -78, createdAt: "" }
];
describe("Show Public Spots profile action", () => {
  it("selects only the chosen user's public spots without a refresh", () => expect(publicSpotsForUser(spots, "u1").map((spot) => spot.id)).toEqual(["s1"]));
  it("returns focus bounds and a clear empty state signal", () => { expect(spotsBounds(publicSpotsForUser(spots, "u1"))).toEqual({ west: -79, east: -79, south: 43, north: 43 }); expect(spotsBounds(publicSpotsForUser(spots, "missing"))).toBeNull(); });
});
