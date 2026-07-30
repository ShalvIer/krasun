import { beforeEach, describe, expect, it, vi } from "vitest";

const { authIdentity, user } = vi.hoisted(() => ({ authIdentity: { findUnique: vi.fn() }, user: { create: vi.fn() } }));
vi.mock("../src/lib/prisma.js", () => ({ prisma: { authIdentity, user } }));

import { authenticateGoogle, usernameIsAvailable } from "../src/auth/authService";

describe("Google authentication service", () => {
  beforeEach(() => vi.clearAllMocks());
  it("uses only the server-verified Google identity", async () => {
    const verified = { subject: "google-sub", email: "verified@example.com", name: "Verified" };
    const verifier = { verify: vi.fn().mockResolvedValue(verified) };
    const created = { id: "user-id", primaryEmail: verified.email };
    authIdentity.findUnique.mockResolvedValue(null); user.create.mockResolvedValue(created);
    await expect(authenticateGoogle("opaque-client-credential", verifier)).resolves.toEqual(created);
    expect(verifier.verify).toHaveBeenCalledWith("opaque-client-credential");
    expect(user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ primaryEmail: verified.email }) }));
  });
  it("enforces unique usernames while allowing the current owner", async () => {
    await expect(usernameIsAvailable("u1", "andron", async () => ({ id: "u2" }))).resolves.toBe(false);
    await expect(usernameIsAvailable("u1", "andron", async () => ({ id: "u1" }))).resolves.toBe(true);
  });
});
