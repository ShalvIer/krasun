import { describe, expect, it, vi } from "vitest";
import { MarkerRegistry, uniqueById } from "./markerRenderCycle";

describe("MarkerRegistry", () => {
  it("preserves the same marker between coordinate updates", () => {
    const registry = new MarkerRegistry();
    const currentMarker = { remove: vi.fn() };
    const duplicateMarker = { remove: vi.fn() };

    expect(registry.retainMarker("user:one", currentMarker)).toBe(true);
    expect(registry.getMarker("user:one")).toBe(currentMarker);

    expect(registry.retainMarker("user:one", duplicateMarker)).toBe(false);
    expect(registry.getMarker("user:one")).toBe(currentMarker);
    expect(currentMarker.remove).not.toHaveBeenCalled();
    expect(duplicateMarker.remove).toHaveBeenCalledOnce();

    registry.removeMissing(new Set(["user:one"]));
    expect(currentMarker.remove).not.toHaveBeenCalled();

    registry.removeMissing(new Set());
    expect(currentMarker.remove).toHaveBeenCalledOnce();
  });

  it("rejects stale avatar results and revokes blob URLs", () => {
    const revokeBlobUrl = vi.fn();
    const registry = new MarkerRegistry(revokeBlobUrl);
    const marker = { remove: vi.fn() };

    registry.retainMarker("user:one", marker);
    const staleRevision = registry.beginUpdate("user:one");
    const currentRevision = registry.beginUpdate("user:one");

    expect(registry.isCurrent("user:one", marker, staleRevision)).toBe(false);
    expect(registry.isCurrent("user:one", marker, currentRevision)).toBe(true);

    registry.retainBlobUrl("user:one", "blob:avatar");
    registry.clear();

    expect(revokeBlobUrl).toHaveBeenCalledWith("blob:avatar");
    expect(marker.remove).toHaveBeenCalledOnce();
  });
});

describe("uniqueById", () => {
  it("keeps only one marker source per user", () => {
    expect(uniqueById([
      { id: "one", coordinate: 1 },
      { id: "one", coordinate: 2 },
      { id: "two", coordinate: 3 },
    ])).toEqual([
      { id: "one", coordinate: 2 },
      { id: "two", coordinate: 3 },
    ]);
  });
});
