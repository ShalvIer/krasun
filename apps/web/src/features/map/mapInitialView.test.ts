import { describe, expect, it } from "vitest";
import { coordinatesFromSearch, ownMapLocation } from "./mapInitialView";

describe("coordinatesFromSearch", () => {
  it("does not turn missing URL parameters into zero coordinates", () => {
    expect(coordinatesFromSearch(new URLSearchParams())).toBeNull();
  });

  it("accepts a complete valid coordinate pair", () => {
    expect(coordinatesFromSearch(new URLSearchParams("lat=43.6532&lng=-79.3832"))).toEqual({
      latitude: 43.6532,
      longitude: -79.3832,
    });
  });

  it("rejects incomplete and out-of-range coordinates", () => {
    expect(coordinatesFromSearch(new URLSearchParams("lat=43.6532"))).toBeNull();
    expect(coordinatesFromSearch(new URLSearchParams("lat=91&lng=-79.3832"))).toBeNull();
  });
});

describe("ownMapLocation", () => {
  const savedLocation = { latitude: 43.66, longitude: -79.4 };
  const currentLocation = { latitude: 43.67, longitude: -79.39 };

  it("prefers the current device location", () => {
    expect(ownMapLocation([{ id: "me", location: savedLocation }], "me", currentLocation)).toEqual(currentLocation);
  });

  it("falls back to the owner's saved location", () => {
    expect(ownMapLocation([{ id: "me", location: savedLocation }], "me", null)).toEqual(savedLocation);
  });
});
