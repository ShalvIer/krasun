export interface RemovableMarker {
  remove(): void;
}

export class MarkerRenderCycle<TMarker extends RemovableMarker = RemovableMarker> {
  private active = true;
  private readonly markers = new Set<TMarker>();
  private readonly blobUrls = new Set<string>();

  constructor(private readonly revokeBlobUrl = (url: string) => URL.revokeObjectURL(url)) {}

  isActive() {
    return this.active;
  }

  retainMarker(marker: TMarker) {
    if (!this.active) {
      marker.remove();
      return false;
    }
    this.markers.add(marker);
    return true;
  }

  retainBlobUrl(url: string) {
    if (!this.active) {
      this.revokeBlobUrl(url);
      return false;
    }
    this.blobUrls.add(url);
    return true;
  }

  cancel() {
    if (!this.active) return;
    this.active = false;
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();
    this.blobUrls.forEach((url) => this.revokeBlobUrl(url));
    this.blobUrls.clear();
  }
}

export function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
