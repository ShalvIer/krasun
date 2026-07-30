import { describe, expect, it, vi } from "vitest";
import { MarkerRenderCycle, uniqueById } from "./markerRenderCycle";

describe("MarkerRenderCycle", () => {
  it("removes current markers and rejects stale async results after cancellation", () => {
    const revokeBlobUrl = vi.fn();
    const currentMarker = { remove: vi.fn() };
    const staleMarker = { remove: vi.fn() };
    const cycle = new MarkerRenderCycle(revokeBlobUrl);

    expect(cycle.retainMarker(currentMarker)).toBe(true);
    expect(cycle.retainBlobUrl("blob:current-avatar")).toBe(true);
    cycle.cancel();

    expect(currentMarker.remove).toHaveBeenCalledOnce();
    expect(revokeBlobUrl).toHaveBeenCalledWith("blob:current-avatar");
    expect(cycle.retainMarker(staleMarker)).toBe(false);
    expect(staleMarker.remove).toHaveBeenCalledOnce();
    expect(cycle.retainBlobUrl("blob:late-avatar")).toBe(false);
    expect(revokeBlobUrl).toHaveBeenCalledWith("blob:late-avatar");
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
