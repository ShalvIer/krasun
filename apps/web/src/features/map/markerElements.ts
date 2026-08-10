export interface MarkerElements {
  root: HTMLDivElement;
  visual: HTMLButtonElement;
}

function createMarkerElements(kind: "user" | "spot"): MarkerElements {
  const root = document.createElement("div");
  root.dataset.krasunMarker = kind;

  const visual = document.createElement("button");
  visual.type = "button";
  visual.className = kind === "user" ? "map-user-marker" : "spot-marker";
  root.append(visual);

  return { root, visual };
}

export function createUserMarkerElements() {
  return createMarkerElements("user");
}

export function createSpotMarkerElements() {
  return createMarkerElements("spot");
}

export function markerVisual(markerRoot: HTMLElement) {
  const visual = markerRoot.querySelector<HTMLButtonElement>(":scope > button");
  if (!visual) throw new Error("Krasun marker visual is missing");
  return visual;
}
