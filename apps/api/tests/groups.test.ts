import { describe, expect, it } from "vitest";
import { canApproveMembers, canRemoveRole, joinOutcome } from "../src/groups/policy";

describe("group join modes and roles", () => {
  it("joins open groups, requests approval, and requires an invite", () => {
    expect(joinOutcome("OPEN", false)).toBe("JOIN");
    expect(joinOutcome("APPROVAL_REQUIRED", true)).toBe("REQUEST");
    expect(joinOutcome("INVITE_ONLY", false)).toBe("DENY");
    expect(joinOutcome("INVITE_ONLY", true)).toBe("JOIN");
  });
  it("keeps owner/admin permissions separate", () => {
    expect(canApproveMembers("OWNER")).toBe(true); expect(canApproveMembers("ADMIN")).toBe(true); expect(canApproveMembers("MEMBER")).toBe(false);
    expect(canRemoveRole("ADMIN", "OWNER")).toBe(false); expect(canRemoveRole("ADMIN", "MEMBER")).toBe(true); expect(canRemoveRole("OWNER", "ADMIN")).toBe(true);
  });
});
