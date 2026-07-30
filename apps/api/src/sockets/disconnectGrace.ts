export const RELOAD_GRACE_MS = 12_000;

const pending = new Map<string, ReturnType<typeof setTimeout>>();

export function cancelPendingDisconnect(userId: string): void {
  const timer = pending.get(userId);
  if (timer) clearTimeout(timer);
  pending.delete(userId);
}

export function afterReloadGrace(
  userId: string,
  callback: () => void | Promise<void>,
  delay = RELOAD_GRACE_MS
): void {
  cancelPendingDisconnect(userId);
  const timer = setTimeout(() => {
    if (pending.get(userId) !== timer) return;
    pending.delete(userId);
    Promise.resolve(callback()).catch(console.error);
  }, delay);
  pending.set(userId, timer);
}
