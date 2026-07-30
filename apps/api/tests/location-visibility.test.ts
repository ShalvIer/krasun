import { describe, expect, it } from "vitest";
import { locationForMapViewer } from "../src/map/locationVisibility";

const hiddenLocation = {
  state: "HIDDEN",
  latitude: 43.6532,
  longitude: -79.3832,
};

describe("locationForMapViewer", () => {
  it("keeps the owner's last coordinate available for self-centering", () => {
    expect(locationForMapViewer("owner", "owner", hiddenLocation)).toEqual(hiddenLocation);
  });

  it("does not reveal a hidden coordinate to another group member", () => {
    expect(locationForMapViewer("viewer", "owner", hiddenLocation)).toEqual({ state: "HIDDEN" });
  });

  it("keeps visible and frozen locations available to group members", () => {
    const frozenLocation = { ...hiddenLocation, state: "FROZEN" };
    expect(locationForMapViewer("viewer", "owner", frozenLocation)).toEqual(frozenLocation);
  });
});
