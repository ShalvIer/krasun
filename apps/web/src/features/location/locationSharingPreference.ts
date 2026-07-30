const PREFERENCE_PREFIX = "krasun:location-sharing:";

function preferenceKey(userId: string) {
  return `${PREFERENCE_PREFIX}${userId}`;
}

export function shouldResumeLocationSharing(userId: string): boolean {
  try {
    return window.sessionStorage.getItem(preferenceKey(userId)) === "enabled";
  } catch {
    return false;
  }
}

export function setLocationSharingPreference(userId: string, enabled: boolean): void {
  try {
    if (enabled) {
      window.sessionStorage.setItem(preferenceKey(userId), "enabled");
    } else {
      window.sessionStorage.removeItem(preferenceKey(userId));
    }
  } catch {
    // Location sharing still works for this page when storage is unavailable.
  }
}
