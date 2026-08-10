import { describe, expect, it } from "vitest";
import { calendarDayKey, daySeparatorLabel, replyPreviewText } from "./chatTimeline";

describe("chat timeline", () => {
  it("groups messages by the viewer's local calendar day", () => {
    expect(calendarDayKey(new Date(2026, 7, 11, 23, 59))).toBe("2026-8-11");
    expect(calendarDayKey(new Date(2026, 7, 12, 0, 1))).toBe("2026-8-12");
  });

  it("uses familiar labels for today, yesterday and older dates", () => {
    const now = new Date(2026, 7, 11, 15);
    expect(daySeparatorLabel(new Date(2026, 7, 11, 1), now)).toBe("Today");
    expect(daySeparatorLabel(new Date(2026, 7, 10, 23), now)).toBe("Yesterday");
    expect(daySeparatorLabel(new Date(2026, 7, 9), now)).toContain("9");
  });

  it("builds compact reply previews for text and media", () => {
    expect(replyPreviewText({ type: "TEXT", text: "Original message" })).toBe("Original message");
    expect(replyPreviewText({ type: "PHOTO", text: null })).toBe("Photo");
    expect(replyPreviewText({ type: "AUDIO", text: null })).toBe("Voice message");
  });
});
