const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://localhost:3001");
let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken() { return accessToken; }

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" })
      .then(async (response) => { if (!response.ok) return false; const data = await response.json() as { accessToken: string }; setAccessToken(data.accessToken); return true; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (!(init.body instanceof FormData) && init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: "include" });
  if (response.status === 401 && retry && await refreshAccessToken()) return apiFetch<T>(path, init, false);
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
    throw new Error(body.error || "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function authenticatedMediaUrl(path: string, retry = true): Promise<string> {
  const response = await fetch(`${API_URL}${path}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}, credentials: "include" });
  if (response.status === 401 && retry && await refreshAccessToken()) return authenticatedMediaUrl(path, false);
  if (!response.ok) throw new Error(`Media could not be loaded (${response.status})`);
  const blob = await response.blob();
  if (!blob.size) throw new Error("The media file is empty");
  return URL.createObjectURL(blob);
}

export { API_URL };
