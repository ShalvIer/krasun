import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SessionUser } from "@krasun/shared-types";
import { apiFetch, API_URL, setAccessToken } from "../../services/api";
import { setLocationSharingPreference } from "../location/locationSharingPreference";

interface AuthValue {
  user: SessionUser | null;
  ready: boolean;
  loginGoogle(credential: string): Promise<void>;
  loginDev(email: string, name: string): Promise<void>;
  completeOnboarding(input: { username: string; displayName?: string; alternateEmail?: string }): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (response) => { if (!response.ok) return; const data = await response.json() as { accessToken: string; user: SessionUser }; setAccessToken(data.accessToken); setUser(data.user); })
      .finally(() => setReady(true));
  }, []);

  async function acceptSession(data: { accessToken: string; user: SessionUser }) { setAccessToken(data.accessToken); setUser(data.user); }
  async function loginGoogle(credential: string) { await acceptSession(await apiFetch("/api/auth/google", { method: "POST", body: JSON.stringify({ credential }) })); }
  async function loginDev(email: string, name: string) { await acceptSession(await apiFetch("/api/auth/dev", { method: "POST", body: JSON.stringify({ email, name }) })); }
  async function completeOnboarding(input: { username: string; displayName?: string; alternateEmail?: string }) { const data = await apiFetch<{ user: SessionUser }>("/api/auth/onboarding", { method: "POST", body: JSON.stringify(input) }); setUser(data.user); }
  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    if (user) setLocationSharingPreference(user.id, false);
    setAccessToken(null);
    setUser(null);
  }

  const value = useMemo(() => ({ user, ready, loginGoogle, loginDev, completeOnboarding, logout }), [user, ready]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("AuthProvider is missing"); return context; }
