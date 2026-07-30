import { beforeEach, describe, expect, it } from "vitest";
import { setLocationSharingPreference, shouldResumeLocationSharing } from "./locationSharingPreference";

describe("location sharing preference", () => {
  beforeEach(() => window.sessionStorage.clear());

  it("remembers sharing separately for each user", () => {
    setLocationSharingPreference("user-a", true);

    expect(shouldResumeLocationSharing("user-a")).toBe(true);
    expect(shouldResumeLocationSharing("user-b")).toBe(false);
  });

  it("stops resuming after sharing is explicitly disabled", () => {
    setLocationSharingPreference("user-a", true);
    setLocationSharingPreference("user-a", false);

    expect(shouldResumeLocationSharing("user-a")).toBe(false);
  });
});
