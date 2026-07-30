import { afterEach, describe, expect, it, vi } from "vitest";
import { afterReloadGrace, cancelPendingDisconnect, RELOAD_GRACE_MS } from "../src/sockets/disconnectGrace";

describe("socket reload grace", () => {
  afterEach(() => {
    vi.useRealTimers();
    cancelPendingDisconnect("user-a");
  });

  it("delays offline work long enough for a normal reload", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    afterReloadGrace("user-a", callback);
    await vi.advanceTimersByTimeAsync(RELOAD_GRACE_MS - 1);
    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("cancels pending offline work when the user reconnects", async () => {
    vi.useFakeTimers();
    const callback = vi.fn();

    afterReloadGrace("user-a", callback);
    cancelPendingDisconnect("user-a");
    await vi.advanceTimersByTimeAsync(RELOAD_GRACE_MS);

    expect(callback).not.toHaveBeenCalled();
  });
});
