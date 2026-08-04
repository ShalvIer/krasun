import { describe, expect, it } from "vitest";
import { messagePushBody } from "../src/push/policy";

describe("push notification policy", () => {
  it("keeps notification text compact", () => {
    expect(messagePushBody("TEXT", "x".repeat(400))).toHaveLength(180);
  });

  it("uses privacy-safe labels for media", () => {
    expect(messagePushBody("AUDIO", null)).toBe("Voice message");
    expect(messagePushBody("PHOTO", null)).toBe("Photo");
  });
});
