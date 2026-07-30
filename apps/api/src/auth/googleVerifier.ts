import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { HttpError } from "../lib/errors.js";

export interface VerifiedGoogleIdentity { subject: string; email: string; name: string; picture?: string; }
export interface GoogleCredentialVerifier { verify(credential: string): Promise<VerifiedGoogleIdentity>; }

export class GoogleIdTokenVerifier implements GoogleCredentialVerifier {
  private client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  async verify(credential: string): Promise<VerifiedGoogleIdentity> {
    if (!env.GOOGLE_CLIENT_ID) throw new HttpError(503, "Google login is not configured", "OAUTH_NOT_CONFIGURED");
    const ticket = await this.client.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new HttpError(401, "Google identity could not be verified", "INVALID_GOOGLE_TOKEN");
    return { subject: payload.sub, email: payload.email, name: payload.name ?? payload.email.split("@")[0] ?? "Krasun user", picture: payload.picture };
  }
}
