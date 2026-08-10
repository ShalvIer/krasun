import { describe, expect, it } from "vitest";
import { directConversationKey, serializeReactions, spotMessageAvailable } from "../src/conversations/policy";
import { messageMediaPath } from "../src/uploads/paths";

describe("conversation invariants", () => {
  it("deduplicates one-to-one conversations regardless of opening order", () => expect(directConversationKey("b", "a")).toBe(directConversationKey("a", "b")));
  it("turns a deleted spot message into unavailable", () => {
    expect(spotMessageAvailable("SPOT", { spotId: "s1" }, new Set(["s1"]))).toBe(false);
    expect(spotMessageAvailable("LOCATION", { spotId: "s1" }, new Set(["s1"]))).toBe(true);
  });
  it("uses the mounted authenticated upload route for message media", () => {
    expect(messageMediaPath("attachment-id")).toBe("/api/uploads/media/attachment-id");
  });
  it("groups reactions and ignores duplicate user entries", () => {
    expect(serializeReactions([
      { emoji: "👍", userId: "u1" },
      { emoji: "👍", userId: "u2" },
      { emoji: "👍", userId: "u1" },
      { emoji: "🔥", userId: "u1" }
    ])).toEqual([
      { emoji: "👍", count: 2, userIds: ["u1", "u2"] },
      { emoji: "🔥", count: 1, userIds: ["u1"] }
    ]);
  });
});
