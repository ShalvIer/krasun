import { apiFetch } from "./api";

export type PushState = "unsupported" | "blocked" | "available" | "enabled";

export async function registerKrasunServiceWorker() {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function currentPushState(subscription: PushSubscription | null): PushState {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return subscription ? "enabled" : "available";
}

export async function getPushSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePushNotifications() {
  const capability = await apiFetch<{ supported: boolean; publicKey: string | null }>("/api/push/public-key");
  if (!capability.supported || !capability.publicKey) throw new Error("Push is not configured on the server yet.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(capability.publicKey)
  });
  await apiFetch("/api/push/subscribe", { method: "POST", body: JSON.stringify(subscription.toJSON()) });
  return subscription;
}

export async function disablePushNotifications() {
  const subscription = await getPushSubscription();
  if (!subscription) return;
  await apiFetch("/api/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint: subscription.endpoint }) });
  await subscription.unsubscribe();
}
