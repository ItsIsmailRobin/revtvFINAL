// Persistence helpers for RevTV.
//
// Storage strategy:
//   sessionStorage  — cleared automatically when the tab is closed, the
//                     browser exits, or on phone/PC restart.  Also always
//                     empty in Incognito/Private mode.  No extra logic needed.
//
// What is remembered:
//   channel id  — restored on refresh (F5 / logo soft-refresh)
//   aspect mode — restored on refresh for the SAME channel; reset on channel change
//   volume      — restored on refresh (PC only; mobile always starts at 1)
//   muted       — restored on refresh (PC only; mobile always starts unmuted)
//
// Fresh start triggers (automatic — no code needed):
//   • Tab close
//   • Browser close / exit
//   • PC or phone restart
//   • Incognito / Private session

export function getItem(key: string): string | null {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}

export function setItem(key: string, value: string): void {
  try { window.sessionStorage.setItem(key, value); } catch {}
}

export function removeItem(key: string): void {
  try { window.sessionStorage.removeItem(key); } catch {}
}

// ── Named helpers (typed wrappers) ──────────────────────────────────────────

export function getPersistedChannel(): string | null {
  return getItem("revtv:channelId");
}
export function setPersistedChannel(id: string): void {
  setItem("revtv:channelId", id);
}

export function getPersistedVolume(): number | null {
  const raw = getItem("revtv:volume");
  if (!raw) return null;
  const v = parseFloat(raw);
  return isNaN(v) ? null : Math.min(1, Math.max(0, v));
}
export function setPersistedVolume(v: number): void {
  setItem("revtv:volume", String(v));
}

export function getPersistedMuted(): boolean | null {
  const raw = getItem("revtv:muted");
  if (raw === null) return null;
  return raw === "true";
}
export function setPersistedMuted(m: boolean): void {
  setItem("revtv:muted", String(m));
}

export function getPersistedAspect(channelId: string): string | null {
  try {
    const raw = getItem("revtv:aspect");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && obj.channelId === channelId) return obj.aspectMode ?? null;
    return null;
  } catch { return null; }
}
export function setPersistedAspect(channelId: string, aspectMode: string): void {
  setItem("revtv:aspect", JSON.stringify({ channelId, aspectMode }));
}

// Legacy stubs so nothing else explodes if imported elsewhere
export function getFresh(_k: string): string | null { return getItem(_k); }
export function setPersisted(k: string, v: string): void { setItem(k, v); }
export function markActivity(): void {}
export function clearAllPersisted(): void {}
export function isSessionStale(): boolean { return false; }
export const INACTIVITY_LIMIT_MS = 0;
