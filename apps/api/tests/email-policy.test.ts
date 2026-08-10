import { describe, expect, it } from "vitest";
import { inactiveRecipientIds, messageEmailPreferenceEnabled, messageEmailPreview, messageEmailSubject } from "../src/email/policy.js";

describe("message email policy", () => {
  it("suppresses recipients who currently have the conversation open", () => {
    expect(inactiveRecipientIds(["one", "two", "three"], new Set(["two"]))).toEqual(["one", "three"]);
  });

  it("requires an explicit boolean opt-in", () => {
    expect(messageEmailPreferenceEnabled(true)).toBe(true);
    expect(messageEmailPreferenceEnabled(false)).toBe(false);
    expect(messageEmailPreferenceEnabled("true")).toBe(false);
    expect(messageEmailPreferenceEnabled(undefined)).toBe(false);
  });

  it("builds group and direct subjects and media previews", () => {
    expect(messageEmailSubject({ conversationType: "GROUP", groupName: "Friends", senderName: "Andron" })).toBe("Новое сообщение в группе Friends");
    expect(messageEmailSubject({ conversationType: "DIRECT", senderName: "Andron" })).toBe("Новое сообщение от Andron");
    expect(messageEmailPreview("PHOTO", null)).toBe("Фото");
  });
});
