export interface RemovableMarker {
  remove(): void;
}

export class MarkerRegistry<TMarker extends RemovableMarker = RemovableMarker> {
  private readonly markers = new Map<string, TMarker>();
  private readonly blobUrls = new Map<string, string>();
  private readonly revisions = new Map<string, number>();

  constructor(
    private readonly revokeBlobUrl = (url: string) => URL.revokeObjectURL(url),
  ) {}

  getMarker(key: string) {
    return this.markers.get(key);
  }

  retainMarker(key: string, marker: TMarker) {
    const existing = this.markers.get(key);

    if (existing && existing !== marker) {
      marker.remove();
      return false;
    }

    if (!existing) this.markers.set(key, marker);
    return true;
  }

  beginUpdate(key: string) {
    const revision = (this.revisions.get(key) ?? 0) + 1;
    this.revisions.set(key, revision);
    return revision;
  }

  isCurrent(key: string, marker: TMarker, revision: number) {
    return (
      this.markers.get(key) === marker &&
      this.revisions.get(key) === revision
    );
  }

  retainBlobUrl(key: string, url: string) {
    const previous = this.blobUrls.get(key);
    if (previous && previous !== url) this.revokeBlobUrl(previous);
    this.blobUrls.set(key, url);
  }

  clearBlobUrl(key: string) {
    const current = this.blobUrls.get(key);
    if (!current) return;
    this.revokeBlobUrl(current);
    this.blobUrls.delete(key);
  }

  discardBlobUrl(url: string) {
    this.revokeBlobUrl(url);
  }

  removeMissing(activeKeys: ReadonlySet<string>) {
    this.markers.forEach((marker, key) => {
      if (activeKeys.has(key)) return;
      marker.remove();
      this.markers.delete(key);
      this.clearBlobUrl(key);
      this.revisions.delete(key);
    });
  }

  clear() {
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();
    this.blobUrls.forEach((url) => this.revokeBlobUrl(url));
    this.blobUrls.clear();
    this.revisions.clear();
  }
}

export function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}
