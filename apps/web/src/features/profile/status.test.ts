import { describe, expect, it } from "vitest";
import { activeStatus, locationLabel } from "./status";

describe("profile state rendering", () => {
  it("does not render expired statuses", () => expect(activeStatus({ expiresAt: "2020-01-01T00:00:00Z", text: "old" }, Date.parse("2026-01-01"))).toBeNull());
  it("describes hidden and frozen states honestly", () => { expect(locationLabel("HIDDEN")).toBe("Location hidden"); expect(locationLabel("FROZEN")).toContain("Frozen"); });
});
