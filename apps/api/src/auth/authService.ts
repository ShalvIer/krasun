import { AuthProvider, type User } from "@prisma/client";
import type { GoogleCredentialVerifier, VerifiedGoogleIdentity } from "./googleVerifier.js";
import { prisma } from "../lib/prisma.js";

export async function findOrCreateGoogleUser(identity: VerifiedGoogleIdentity): Promise<User> {
  const existing = await prisma.authIdentity.findUnique({ where: { provider_subject: { provider: AuthProvider.GOOGLE, subject: identity.subject } }, include: { user: true } });
  if (existing) return existing.user;
  return prisma.user.create({
    data: {
      primaryEmail: identity.email.toLowerCase(),
      displayName: identity.name,
      profileAvatarPath: identity.picture,
      identities: { create: { provider: AuthProvider.GOOGLE, subject: identity.subject } }
    }
  });
}

export async function authenticateGoogle(credential: string, verifier: GoogleCredentialVerifier) {
  return findOrCreateGoogleUser(await verifier.verify(credential));
}

export async function usernameIsAvailable(currentUserId: string, username: string, lookup: (username: string) => Promise<{ id: string } | null>) {
  const existing = await lookup(username);
  return !existing || existing.id === currentUserId;
}
