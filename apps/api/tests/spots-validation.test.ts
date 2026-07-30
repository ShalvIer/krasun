import { describe, expect, it } from "vitest";
import { coordinateSchema, spotInputSchema, textMessageSchema } from "@krasun/shared-validation";
import { canViewSpot } from "../src/spots/policy";

describe("spot, location and message security", () => {
  it("keeps private spots owner-only and public spots common-group-only", () => {
    expect(canViewSpot({ visibility: "PRIVATE", ownerId: "owner" }, "admin", true)).toBe(false);
    expect(canViewSpot({ visibility: "PRIVATE", ownerId: "owner" }, "owner", false)).toBe(true);
    expect(canViewSpot({ visibility: "PUBLIC", ownerId: "owner" }, "viewer", true)).toBe(true);
    expect(canViewSpot({ visibility: "PUBLIC", ownerId: "owner" }, "viewer", false)).toBe(false);
  });
  it("rejects invalid coordinates and malformed durable inputs", () => {
    expect(() => coordinateSchema.parse({ latitude: 95, longitude: 0 })).toThrow();
    expect(() => spotInputSchema.parse({ title: "", visibility: "PUBLIC", latitude: 0, longitude: 0 })).toThrow();
    expect(() => textMessageSchema.parse({ conversationId: "bad", text: "" })).toThrow();
  });
});
