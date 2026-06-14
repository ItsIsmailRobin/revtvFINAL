// Shared persistence helpers.
//
// Strategy:
// - Channel + Aspect: stored in localStorage (survives refresh, cleared on tab/browser close via beforeunload)
// - Volume + Brightness: NEVER persisted (always fresh on every load)
// - On Android/iOS: volume + brightness never persisted (naturally satisfied since they're never stored)
// - On close/restart: beforeunload clears everything → fresh start
// - On refresh (F5/reload): localStorage keeps channel + aspect, giving a smooth restore
//
// Summary:
//   Refresh → channel + aspect remembered, volume/brightness fresh
//   Close tab / browser / phone power off → everything fresh next visit
//   Android/iOS: volume/brightness always fresh (never stored)

const CHANNEL_KEY = "revtv:lastChannelId";
const ASPECT_KEY  = "revtv:aspect";

// Register a beforeunload handler once to clear all persisted state
// when the tab/browser is closed. This makes close = fresh start.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    try {
      localStorage.removeItem(CHANNEL_KEY);
      localStorage.removeItem(ASPECT_KEY);
    } catch {}
  });
}

export function getPersistedChannel(): string | null {
  try {
    return localStorage.getItem(CHANNEL_KEY);
  } catch {
    return null;
  }
}

export function setPersistedChannel(id: string): void {
  try {
    localStorage.setItem(CHANNEL_KEY, id);
  } catch {}
}

export function getPersistedAspect(): string | null {
  try {
    return localStorage.getItem(ASPECT_KEY);
  } catch {
    return null;
  }
}

export function setPersistedAspect(value: string): void {
  try {
    localStorage.setItem(ASPECT_KEY, value);
  } catch {}
}

export function clearAllPersisted(): void {
  try {
    localStorage.removeItem(CHANNEL_KEY);
    localStorage.removeItem(ASPECT_KEY);
  } catch {}
}

// Stubs kept for compatibility if anything imports these, but they are no-ops.
export function getFresh(_key: string): string | null { return null; }
export function setPersisted(_key: string, _value: string): void {}
export function markActivity(): void {}
export const INACTIVITY_LIMIT_MS = 0;
export function isSessionStale(): boolean { return false; }
