// Shared persistence helpers for "remember within this session, but not
// forever" behavior.
//
// - Uses sessionStorage instead of localStorage:
//     * sessionStorage is cleared the moment the tab/browser closes, so
//       a new Incognito/Private session starts completely fresh with
//       nothing remembered — exactly what's wanted there, with zero
//       incognito-detection hacks.
// - On top of that, we track a "last activity" timestamp. If more than
//   INACTIVITY_LIMIT_MS has passed since the user last interacted with
//   the player (tab left open and idle), stored preferences are treated
//   as stale and reset to defaults — so coming back after 10+ minutes
//   away gives a fresh start (default channel, aspect, volume, mute).

const ACTIVITY_KEY = "revtv:lastActivity";
export const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

/** Record that the user is actively using the player right now. Call this
 *  on meaningful interactions (channel switch, volume/mute change, etc). */
export function markActivity(): void {
  try {
    window.sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  } catch {}
}

/** True if more than INACTIVITY_LIMIT_MS has passed since the last
 *  recorded activity (or no activity has ever been recorded). */
export function isSessionStale(): boolean {
  try {
    const raw = window.sessionStorage.getItem(ACTIVITY_KEY);
    if (!raw) return true;
    const last = parseInt(raw, 10);
    if (isNaN(last)) return true;
    return Date.now() - last > INACTIVITY_LIMIT_MS;
  } catch {
    return true;
  }
}

/** Read a stored value, but only if the session isn't stale. If the
 *  session IS stale, the key is removed and `null` is returned — this
 *  also clears stale data for any preference that happens to ask for it. */
export function getFresh(key: string): string | null {
  try {
    if (isSessionStale()) {
      clearAllPersisted();
      return null;
    }
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setPersisted(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
    markActivity();
  } catch {}
}

/** Remove every revtv:-prefixed key from sessionStorage (used when the
 *  session is detected as stale, to fully reset to a clean state). */
export function clearAllPersisted(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith("revtv:")) keys.push(k);
    }
    keys.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {}
}

// ── Cross-session playlist cache (localStorage) ─────────────────────
// Unlike the sessionStorage helpers above, this is intentionally
// persisted in localStorage so the channel list and player can render
// INSTANTLY on a brand-new tab / hard refresh — before the live M3U
// fetch even resolves. The fresh fetch still runs in the background
// and overwrites this cache once it completes.
const PLAYLIST_CACHE_KEY = "revtv:playlistCache";

export function getCachedPlaylist<T>(): T | null {
  try {
    // First try the synchronously-available window cache set by the inline
    // prefetch script in index.html (already parsed from localStorage).
    const w = window as any;
    if (w.__revtv_cache__) return w.__revtv_cache__ as T;
    const raw = window.localStorage.getItem(PLAYLIST_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCachedPlaylist<T>(data: T): void {
  try {
    window.localStorage.setItem(PLAYLIST_CACHE_KEY, JSON.stringify(data));
  } catch {}
}
