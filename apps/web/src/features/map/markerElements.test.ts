import { describe, expect, it } from "vitest";
import { createSpotMarkerElements, createUserMarkerElements, markerVisual } from "./markerElements";

describe("marker elements", () => {
  it("keeps the Mapbox positioning root separate from the user visual", () => {
    const { root, visual } = createUserMarkerElements();

    root.classList.add("mapboxgl-marker", "mapboxgl-marker-anchor-center");
    visual.className = "map-user-marker state-live";

    expect(markerVisual(root)).toBe(visual);
    expect(root.classList.contains("mapboxgl-marker")).toBe(true);
    expect(root.classList.contains("mapboxgl-marker-anchor-center")).toBe(true);
  });

  it("applies spot rotation only to the inner visual", () => {
    const { root, visual } = createSpotMarkerElements();

    expect(root.dataset.krasunMarker).toBe("spot");
    expect(root.className).toBe("");
    expect(visual.className).toBe("spot-marker");
  });
});
