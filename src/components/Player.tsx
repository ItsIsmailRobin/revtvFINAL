import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Hls from "hls.js";
import type { Channel } from "../utils/parseM3U";
import { cn } from "../utils/cn";
import { getFresh, setPersisted, markActivity } from "../utils/persist";

interface PlayerProps {
  channel: Channel | null;
  /** Called when a stream fails fatally — parent uses this to skip to next channel */
  onStreamError?: (channel: Channel) => void;
  /** Channel IDs that were just chosen by an explicit tap on the channel
   *  list (as opposed to the page loading, restoring the last channel, or
   *  an automatic skip-on-error). A genuine tap is a real user gesture —
   *  Player consumes (deletes) the id once it reads it, and uses it to
   *  skip the muted-first / tap-to-unmute dance and autoplay unmuted
   *  directly. Shared mutable Set so it can be updated without forcing an
   *  extra render on the parent. */
  manualChannelIds?: Set<string>;
  /**
   * The NEXT channel to preload silently in the background.
   * A hidden, muted, paused HLS instance fetches just enough fragments
   * so that switching to this channel starts instantly.
   * This never affects the audio/video quality of the currently-watched channel —
   * the preloader stops downloading after a short prefetch window.
   */
  nextChannel?: Channel | null;
}

interface GestureState {
  startX: number;
  startY: number;
  startValue: number;
  side: "left" | "right" | null;
  active: boolean;
  locked: boolean;
}

// Module-level so it can be used inside useState initializers (which run
// before any effects). Mirrors the in-effect isMobile/isIOS checks.
function detectIsMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))
  );
}

export default function Player({
  channel,
  onStreamError,
  manualChannelIds,
  nextChannel,
}: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const volumeWheelRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const gestureLayerRef = useRef<HTMLDivElement>(null);

  // ── Background preloader ──────────────────────────────────────────────────
  // A hidden, muted <video> element with its own HLS instance that fetches
  // just enough fragments of the NEXT channel so switching to it is instant.
  // Rules that keep it from hurting main playback quality:
  //   • Only starts after the main channel has been playing for 5 seconds.
  //   • Uses the lowest ABR quality level (startLevel: 0) and a tiny buffer cap.
  //   • Stops downloading (hls.stopLoad()) after 8 seconds of prefetch.
  //   • Destroyed immediately when the main channel changes or on unmount.
  const preloadVideoRef = useRef<HTMLVideoElement>(null);
  const preloadHlsRef   = useRef<Hls | null>(null);
  const preloadTimerRef = useRef<number | null>(null); // delay before preload starts
  const preloadStopRef  = useRef<number | null>(null); // timer to stop loading after prefetch

  const gestureState = useRef<GestureState>({
    startX: 0,
    startY: 0,
    startValue: 0,
    side: null,
    active: false,
    locked: false,
  });
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const isSwiping = useRef(false);
  // Tracks whether the user deliberately paused — prevents auto-resume from
  // firing when the user hits the pause button intentionally.
  const userPausedRef = useRef(false);
  // React state mirror of userPausedRef — needed so the paused overlay
  // condition re-renders when the user taps pause/play.
  const [userPaused, setUserPaused] = useState(false);
  // Tracks whether the current channel has started playing at least once
  // since being switched to — used to suppress the pause/play glass
  // overlay during the brief loading window right after a channel switch.
  const hasStartedPlaybackRef = useRef(false);

  const [playing, setPlaying] = useState(false);

  // ── Mute/Volume persistence ────────────────────────────────────────────
  // ALL platforms (PC, Android, iOS): restore muted state from localStorage
  // across refreshes, tab opens, logo taps, and channel switches.
  // Default: unmuted (false). Only store/restore "muted=true" since that's
  // the only case where we want to remember the user's choice.
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("revtv:muted") === "true";
    } catch {
      return false;
    }
  });
  const [volume, setVolume] = useState<number>(() => {
    try {
      const v = parseFloat(window.localStorage.getItem("revtv:volume") ?? "1");
      return isNaN(v) ? 1 : Math.min(1, Math.max(0, v));
    } catch {
      return 1;
    }
  });

  // Refs mirroring muted/volume so the channel-switch effect (which only
  // re-runs on channel change) can read the latest user preference
  // without forcing a full HLS re-attach on every mute/volume toggle.
  const mutedRef = useRef(muted);
  const volumeRef = useRef(volume);
  useEffect(() => {
    mutedRef.current = muted;
    try { window.localStorage.setItem("revtv:muted", String(muted)); } catch {}
  }, [muted]);
  useEffect(() => {
    volumeRef.current = volume;
    try { window.localStorage.setItem("revtv:volume", String(volume)); } catch {}
  }, [volume]);
  // Brightness: in-memory only on every platform (never persisted), and
  // explicitly reset to default each session on Android/iOS per above —
  // since it's already not persisted, this is naturally satisfied.
  const [brightness, setBrightness] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  // Fallback override: when the native Fullscreen API fails (e.g. inside
  // an iframe preview where requestFullscreen is blocked), this state
  // forces the position:fixed overlay to cover the viewport anyway.
  const [fsOverride, setFsOverride] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "entering" | "exiting" | null — shown briefly during fullscreen transition.
  const [fsTransitioning, setFsTransitioning] = useState<"entering" | "exiting" | null>(null);
  const [gestureLevel, setGestureLevel] = useState<{
    type: "volume" | "brightness" | null;
    value: number;
    visible: boolean;
  }>({ type: null, value: 0, visible: false });

  // Aspect ratio modes: "contain" (default letterbox), "cover" (fill,
  // may crop), "fill" (stretch to fill, no aspect ratio preservation),
  // "native" (use video's intrinsic size).
  type AspectMode = "contain" | "cover" | "fill" | "native";
  const [aspectMode, setAspectMode] = useState<AspectMode>("contain");

  // Per-channel aspect ratio memory:
  // - On refresh / logo click, the same channel is restored — also
  //   restore the aspect ratio it was last set to.
  // - On switching to a different channel, always reset to default
  //   ("contain"), even if returning to a previously-viewed channel.
  const lastChannelIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!channel) return;
    if (lastChannelIdRef.current === channel.id) return;
    lastChannelIdRef.current = channel.id;

    let restored: AspectMode | null = null;
    try {
      const raw = getFresh("revtv:aspect");
      if (raw) {
        const saved = JSON.parse(raw);
        if (
          saved &&
          saved.channelId === channel.id &&
          (saved.aspectMode === "contain" ||
            saved.aspectMode === "cover" ||
            saved.aspectMode === "fill" ||
            saved.aspectMode === "native")
        ) {
          restored = saved.aspectMode;
        }
      }
    } catch {}

    setAspectMode(restored ?? "contain");
  }, [channel?.id]);

  // Keep storage in sync with the current channel + aspect mode, so a
  // refresh/logo click can restore it for THIS channel only — and only
  // within the same active session (see utils/persist.ts).
  useEffect(() => {
    if (!channel) return;
    setPersisted(
      "revtv:aspect",
      JSON.stringify({ channelId: channel.id, aspectMode })
    );
  }, [channel?.id, aspectMode]);

  // Status indicator — shows current volume / aspect ratio briefly
  // when the user changes them via keyboard, then fades out after 3s.
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusVisible, setStatusVisible] = useState(false);
  // ALL platforms (PC, Android, iOS): true only on first-ever visit when
  // no gesture grant exists in localStorage yet.
  // Shows the glass blurred overlay — tap anywhere to unmute.
  // After that one tap, "revtv:gestureGranted" is stored forever in localStorage.
  // From then on (refresh, Ctrl+R, hard reload, channel change, tab reopen)
  // the player always autoplays with sound. Overlay never shown again.
  const [needsUnmute, setNeedsUnmute] = useState(false);
  // True while the tap-to-unmute overlay is playing its fade-out exit animation.
  // The overlay stays mounted during the animation so it can fade smoothly,
  // then is fully removed once the animation completes.
  const [unmuteFading, setUnmuteFading] = useState(false);
  // When switching channels (isManualSelect), the overlay should vanish
  // instantly (no lingering fade) — this ref tracks that case.
  const unmuteFadeTimerRef = useRef<number | null>(null);
  // True while the autoplay-muted phase is active (overlay shown OR about
  // to be shown). Set synchronously by the HLS effect, cleared by doUnmute
  // or the grant-exists unmute path. The sync-volume useEffect reads this
  // ref to avoid overriding v.muted=true during the muted-autoplay window.
  const autoplayMutedRef = useRef(false);
  // Timestamp of the most recent "grant exists -> auto-unmute" attempt
  // (see onMutedPlayStarted below). Some browsers will silently force-pause
  // playback if JS unmutes a video on a page load that wasn't recognized as
  // gesture-driven (a plain hard refresh / Ctrl+R / pull-to-refresh, as
  // opposed to a click-driven navigation like the logo tap, which browsers
  // do treat as gesture-qualified). onPause uses this timestamp to detect
  // that exact case and recover gracefully — falling back to muted autoplay
  // + the tap-to-unmute overlay — instead of leaving the player stuck
  // paused and silent.
  const recentAutoUnmuteRef = useRef(0);
  const statusTimerRef = useRef<number | null>(null);

  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    setStatusVisible(true);
    if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => {
      setStatusVisible(false);
    }, 3000);
  }, []);

  const presentationFullscreen = isFullscreen || fsOverride;

  // Dismiss the tap-to-unmute overlay: quick fade-out then fully remove.
  // Pass instant=true to skip the animation (e.g. on channel switch).
  const dismissUnmuteOverlay = useCallback((instant = false) => {
    if (unmuteFadeTimerRef.current) window.clearTimeout(unmuteFadeTimerRef.current);
    if (instant) {
      setUnmuteFading(false);
      setNeedsUnmute(false);
      return;
    }
    // Start fade-out animation, then remove after it completes (180ms)
    setUnmuteFading(true);
    unmuteFadeTimerRef.current = window.setTimeout(() => {
      setNeedsUnmute(false);
      setUnmuteFading(false);
    }, 180);
  }, []);

  // Human-readable aspect label
  const aspectLabel = useCallback(
    (mode: AspectMode): string => {
      if (mode === "contain") return "Fit";
      if (mode === "cover") return "Fill";
      if (mode === "fill") return "Stretch";
      return "Native";
    },
    []
  );

  // Cycle through aspect modes: contain → cover → fill → native → contain
  const cycleAspect = useCallback(() => {
    setAspectMode((prev) => {
      const next: AspectMode =
        prev === "contain"
          ? "cover"
          : prev === "cover"
          ? "fill"
          : prev === "fill"
          ? "native"
          : "contain";
      showStatus(`Aspect: ${aspectLabel(next)}`);
      return next;
    });
  }, [aspectLabel, showStatus]);

  // Show volume status when volume changes via keyboard/wheel (not on mute toggles)
  const prevMutedRef = useRef(muted);
  const isFirstRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevMutedRef.current = muted;
      return;
    }
    if (!channel) return;
    const mutedChanged = muted !== prevMutedRef.current;
    prevMutedRef.current = muted;
    if (!mutedChanged && !muted && volume > 0) {
      // Volume wheel/keyboard change — show volume %
      showStatus(`Volume: ${Math.round(volume * 100)}%`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, muted]);

  // ---- HLS attach / detach ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) return;

    setError(null);
    setPlaying(false);
    userPausedRef.current = false;
    setUserPaused(false);
    recentAutoUnmuteRef.current = 0;
    lastLiveSnapRef.current = 0;
    // Suppress the pause overlay until the new channel has actually
    // started playing at least once — prevents the glass play button
    // flashing during the brief setPlaying(false) → setPlaying(true)
    // window on every channel switch.
    hasStartedPlaybackRef.current = false;
    // Delay showing the loading spinner — the previous frame stays visible
    // during the brief handoff, so the screen never goes dark on channel switch.
    const loadingTimer = window.setTimeout(() => setLoading(true), 300);

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));

    // Was this channel chosen by an explicit tap on the channel list (as
    // opposed to the page just loading, restoring the last channel, or an
    // automatic skip-on-error)? If so, we have a fresh, genuine user
    // gesture to work with — skip the muted-first dance and the
    // tap-to-unmute overlay entirely and go straight to unmuted autoplay,
    // on every platform (PC, Android, iOS).
    const isManualSelect = !!(channel && manualChannelIds?.has(channel.id));
    if (isManualSelect && channel) manualChannelIds!.delete(channel.id);
    // On manual channel switch, dismiss any lingering unmute overlay instantly
    // (no fade — the switch itself is already a fast visual transition).
    if (isManualSelect) {
      if (unmuteFadeTimerRef.current) window.clearTimeout(unmuteFadeTimerRef.current);
      setUnmuteFading(false);
      setNeedsUnmute(false);
    }

    // iOS (incl. iPadOS "desktop" UA on Safari) has strict autoplay-with-sound
    // privacy rules — attempting the "play unmuted, fall back to muted, then
    // try to unmute again" trick either fails silently or can leave the
    // player stuck. On iOS we go straight to muted autoplay (always allowed)
    // and surface the existing "Tap to unmute" overlay for the user.
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));

    // Track recovery attempts to avoid infinite loops
    let networkRetries = 0;
    let mediaRetries = 0;
    const MAX_NETWORK_RETRIES = 8;  // more retries for slow/loaded servers
    const MAX_MEDIA_RETRIES   = 4;

    // Skip timer: if stream doesn't produce a frame within N seconds, skip it.
    // Use generous timeouts so slow-starting streams (high server load, CDN
    // warm-up) are not incorrectly killed — they work fine in VLC because VLC
    // waits much longer before giving up.
    const skipTimer = window.setTimeout(() => {
      if (channel) onStreamError?.(channel);
    }, isIOS ? 35000 : isMobile ? 30000 : 25000);

    // ── Helpers ──────────────────────────────────────────────────────────
    // Snap currentTime to the live edge. Safe to call any time.
    const snapToLive = (v: HTMLVideoElement) => {
      const hls = hlsRef.current;
      if (hls && hls.liveSyncPosition != null && isFinite(hls.liveSyncPosition)) {
        v.currentTime = hls.liveSyncPosition;
      } else if (v.seekable.length > 0) {
        const end = v.seekable.end(v.seekable.length - 1);
        if (isFinite(end)) v.currentTime = end;
      }
    };

    // ── Stall guard ───────────────────────────────────────────────────────
    // Single debounce flag shared by onPause / onStalled / frozen detector.
    // Prevents stacking multiple simultaneous recover attempts (the root
    // cause of the load→play→load→play loop on slow connections).
    let recoverScheduled = false;
    let recoverTimer = 0;
    // Cooldown after a recover — ignore new stall/pause/freeze triggers for
    // a short window right after we just recovered. Mobile connections often
    // report a brief "stalled"/"pause" blip immediately after resuming,
    // which was re-triggering scheduleRecover and causing a visible
    // loading→play→loading loop every couple of seconds.
    let recoverCooldownUntil = 0;
    // iOS native HLS rebuffers more slowly than hls.js on Android/desktop —
    // give it the longest cooldown so we don't repeatedly call play()/seek
    // while it's still naturally recovering (which restarts its internal
    // buffering and looks like "loading again").
    // Also raised on desktop to prevent rapid-fire recovery on slow/shared streams.
    const RECOVER_COOLDOWN_MS = isIOS ? 10000 : isMobile ? 10000 : 4000;
    let waitingTimer = 0;

    const scheduleRecover = (delayMs: number, snap = false) => {
      if (recoverScheduled || userPausedRef.current) return;
      if (Date.now() < recoverCooldownUntil) return;
      recoverScheduled = true;
      recoverTimer = window.setTimeout(() => {
        recoverScheduled = false;
        recoverCooldownUntil = Date.now() + RECOVER_COOLDOWN_MS;
        const v = videoRef.current;
        if (!v || v.ended || userPausedRef.current) return;
        // On iOS native HLS, seeking to the live edge while the player is
        // still buffering throws away progress and restarts the load —
        // this is what produced "loading → loading again → skip". Just
        // nudge play() and let AVPlayer's own buffering resolve it.
        // On Android/desktop, only snap to live when explicitly requested
        // (truly frozen) — a plain stall/pause blip should NOT discard
        // buffered data, since that's exactly what restarts the
        // load → play → load cycle on mobile.
        if (!isIOS && snap) snapToLive(v);
        v.play().catch(() => {});
      }, delayMs);
    };

    // ── Video events ─────────────────────────────────────────────────────
    const onPlaying = () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(loadingTimer);
      window.clearTimeout(recoverTimer);
      window.clearTimeout(waitingTimer);
      recoverScheduled = false;
      nativeErrorRetries = 0;
      hasStartedPlaybackRef.current = true;
      setLoading(false);
      setPlaying(true);
    };
    const onWaiting  = () => {
      // On mobile, a brief "waiting" event is normal during ABR level
      // switches / minor rebuffers and resolves on its own. Give a generous
      // grace window (5s mobile, 2s desktop) before showing the spinner —
      // this avoids the load→play→load loop on slower connections and
      // high-visitor scenarios where the stream is momentarily slow.
      if (isMobile) {
        window.clearTimeout(waitingTimer);
        waitingTimer = window.setTimeout(() => setLoading(true), 5000);
      } else {
        window.clearTimeout(waitingTimer);
        waitingTimer = window.setTimeout(() => setLoading(true), 2000);
      }
    };
    const onPause    = () => {
      setPlaying(false);
      if (userPausedRef.current) return;

      // Did the browser just force-pause this video right after we
      // auto-unmuted it (the "grant exists" path in onMutedPlayStarted)?
      // This happens on page loads the browser doesn't treat as
      // gesture-qualified — typically a plain hard refresh / Ctrl+R /
      // pull-to-refresh — as opposed to a click-driven navigation like the
      // logo tap, which IS treated as gesture-qualified and never gets
      // punished this way. Recover by falling back to muted autoplay and
      // surfacing the tap-to-unmute overlay, instead of leaving the
      // player stuck paused and silent.
      const v = videoRef.current;
      const sinceUnmute = recentAutoUnmuteRef.current ? Date.now() - recentAutoUnmuteRef.current : Infinity;
      if (v && !v.muted && sinceUnmute < 2500) {
        recentAutoUnmuteRef.current = 0;
        autoplayMutedRef.current = true; // re-enter the muted-autoplay window
        v.muted = true;
        v.play().then(() => {
          setNeedsUnmute(true); // one tap restores sound, same as first-visit overlay
          setUnmuteFading(false);
        }).catch(() => {
          autoplayMutedRef.current = false;
          scheduleRecover(isIOS ? 1800 : isMobile ? 1500 : 700);
        });
        return;
      }

      scheduleRecover(isIOS ? 1800 : isMobile ? 1500 : 700);
    };
    const onStalled  = () => { scheduleRecover(isIOS ? 2000 : isMobile ? 2000 : 1000); };   // buffer empty — recover
    const onEnded    = () => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = 0;
      v.play().catch(() => {});
    };
    // Native <video> error event (used on the iOS native-HLS path — hls.js
    // has its own ERROR handler below). iOS/Safari can fire a transient
    // "error" during normal rebuffering on a flaky connection, not just on
    // a truly broken stream. Previously this skipped the channel
    // immediately, which is the "it even skips the channel" symptom.
    // Retry by reloading the source with backoff first; only skip after
    // repeated failures.
    let nativeErrorRetries = 0;
    const MAX_NATIVE_ERROR_RETRIES = 4;
    const onError    = () => {
      if (isIOS && nativeErrorRetries < MAX_NATIVE_ERROR_RETRIES) {
        nativeErrorRetries++;
        const v = videoRef.current;
        window.setTimeout(() => {
          if (!v || userPausedRef.current) return;
          // Reload the source — clears the errored media element state
          // without tearing down the whole player/effect.
          v.src = channel.url;
          v.play().catch(() => {});
        }, 500 * Math.pow(2, nativeErrorRetries - 1)); // 500ms, 1s, 2s, 4s
        return;
      }
      setLoading(false);
      if (channel) onStreamError?.(channel);
    };

    // ── Frozen detector (1-second interval) ──────────────────────────────
    // timeupdate fires ~4×/s but slows down when tab is hidden.
    // A dedicated 1-second interval is more reliable for detecting a truly
    // frozen stream on both mobile and PC.
    // Thresholds are generous — a stream that works in VLC but appears
    // "frozen" here is almost always just slow to deliver frames under
    // load; give it plenty of time before acting.
    let lastTime  = -1;
    let frozenSec = 0;
    const FROZEN_THRESHOLD = isIOS ? 18 : isMobile ? 14 : 10; // seconds before we act
    const frozenWatchdog = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || v.seeking || userPausedRef.current) {
        lastTime = -1; frozenSec = 0; return;
      }
      if (v.currentTime === lastTime) {
        frozenSec++;
        if (frozenSec >= FROZEN_THRESHOLD) {
          frozenSec = 0; lastTime = -1;
          scheduleRecover(0, true); // snap immediately — stream is definitely frozen
        }
      } else {
        frozenSec = 0;
        lastTime  = v.currentTime;
      }
    }, 1000);

    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("pause",   onPause);
    video.addEventListener("ended",   onEnded);
    video.addEventListener("error",   onError);

    // ── Unified autoplay logic ──────────────────────────────────────────────
    // Works identically on PC, Android, and iOS.
    //
    // HOW IT WORKS:
    //   0. MANUAL CHANNEL TAP (isManualSelect=true): the user just tapped this
    //      channel in the list — a fresh, genuine gesture. Skip everything
    //      below and autoplay unmuted directly. No overlay, ever.
    //   1. Otherwise, check localStorage for "revtv:gestureGranted".
    //   2. FIRST VISIT (no grant): autoplay muted → show the glass tap-to-unmute
    //      overlay. User taps → unmute + store grant forever. Done.
    //   3. ANY SUBSEQUENT AUTOMATIC LOAD (grant exists — refresh, Ctrl+R, hard
    //      reload, logo tap, tab reopen): autoplay muted → immediately unmute
    //      in the .then() callback. No overlay shown. Always with sound.
    //
    // WHY MUTED FIRST (for path 2/3, not the manual-tap path):
    //   Browsers always allow muted autoplay. Once the video is playing (even
    //   muted), unmuting in the same .then() does NOT count as a new autoplay
    //   request — it is treated as a volume change on an already-playing element.
    //   This works on Chrome, Firefox, Edge, Chrome Android, Safari (with grant) —
    //   except that some browsers will still force-pause it on a page load they
    //   don't consider gesture-qualified (see onPause's recovery for that case).
    //
    // WHY A GRANT IS NEEDED ON FIRST VISIT:
    //   On the very first page load (ever, or in a fresh private session), there
    //   has been no user interaction at all. Some browsers (Safari on iOS/macOS,
    //   strict Chrome profiles) block even the "unmute in .then()" trick until a
    //   real tap/click has occurred. The overlay provides that one tap. After it,
    //   the grant is stored and the browser's autoplay heuristic remembers the
    //   site as "user has interacted here".

    // Check gesture grant once per channel-load (stable, no closure issues)
    const hasGrant = (() => {
      try { return window.localStorage.getItem("revtv:gestureGranted") === "1"; } catch { return false; }
    })();

    // Hoisted so the cleanup return() can remove it even when the channel
    // changes before loadedmetadata fires on iOS native HLS.
    let iosMetaCleanup: (() => void) | null = null;

    const onMutedPlayStarted = () => {
      // On iOS, check if this page load came from a trusted logo-tap gesture.
      // The logo tap sets "revtv:logoTapNav" in sessionStorage just before
      // navigating. We consume (delete) the flag immediately so it only
      // applies once — for this one load only.
      let iosLogoTapNav = false;
      if (isIOS) {
        try {
          iosLogoTapNav = sessionStorage.getItem("revtv:logoTapNav") === "1";
          if (iosLogoTapNav) sessionStorage.removeItem("revtv:logoTapNav");
        } catch {}
      }

      if (!hasGrant || (isIOS && !iosLogoTapNav)) {
        // First-ever visit OR iOS without a trusted logo-tap gesture
        // (iOS requires a real tap to unmute on every page load —
        // it does not allow the auto-unmute trick unless this load
        // was triggered by a direct user tap like the logo):
        // stay muted, show tap-to-unmute overlay.
        // autoplayMutedRef stays true — cleared synchronously by doUnmute().
        setNeedsUnmute(true);
        setUnmuteFading(false);
      } else {
        // Grant exists: unmute immediately now that we have a playing element.
        // Clear the flag BEFORE writing v.muted so the sync-volume effect
        // does not interfere (it reads the ref synchronously).
        autoplayMutedRef.current = false;
        setNeedsUnmute(false);
        setUnmuteFading(false);
        const vid = videoRef.current;
        if (vid) {
          const willUnmute = !mutedRef.current;
          vid.muted  = mutedRef.current;
          vid.volume = volumeRef.current || 1;
          if (willUnmute) recentAutoUnmuteRef.current = Date.now();
        }
      }
    };

    const attemptAutoplay = (v: HTMLVideoElement, direct: boolean) => {
      if (direct) {
        // Fresh, genuine user gesture (the user just tapped this channel
        // in the list) — browsers allow unmuted autoplay directly off a
        // gesture like this, so skip the muted-first dance and the
        // tap-to-unmute overlay entirely. Go straight to sound, respecting
        // whatever mute/volume the user already has set (defaults to
        // unmuted at 100% on a fresh visit).
        autoplayMutedRef.current = false;
        setNeedsUnmute(false);
        v.muted = mutedRef.current;
        v.volume = volumeRef.current || 1;
        if (!mutedRef.current) recentAutoUnmuteRef.current = Date.now();
        const directPromise = v.play();
        if (!directPromise) {
          if (!mutedRef.current) { try { window.localStorage.setItem("revtv:gestureGranted", "1"); } catch {} }
          return;
        }
        directPromise.then(() => {
          // This genuinely played with sound off a real tap — persist the
          // grant so future reloads skip straight to "grant exists" mode
          // too, even if the user's very first interaction ever was a
          // channel tap rather than the tap-to-unmute overlay.
          if (!mutedRef.current) { try { window.localStorage.setItem("revtv:gestureGranted", "1"); } catch {} }
        }).catch(() => {
          // Very rare safety net (e.g. an unusually strict mobile browser
          // that doesn't treat this as gesture-qualified) — fall back to
          // the standard muted-first dance below.
          const vid = videoRef.current;
          if (!vid || userPausedRef.current) return;
          attemptAutoplay(vid, false);
        });
        return;
      }

      // Signal that we are in the autoplay-muted window — blocks the
      // sync-volume useEffect from overriding v.muted during this phase.
      autoplayMutedRef.current = true;
      v.muted = true;
      v.volume = volumeRef.current || 1;

      const playPromise = v.play();
      if (!playPromise) {
        onMutedPlayStarted();
        return;
      }

      playPromise.then(() => {
        onMutedPlayStarted();
      }).catch(() => {
        // Muted play rejected — retry once after a short delay.
        window.setTimeout(() => {
          const vid = videoRef.current;
          if (!vid || userPausedRef.current) return;
          vid.muted = true;
          vid.play().then(() => {
            onMutedPlayStarted();
          }).catch(() => {
            // Both attempts failed — release the flag so sync-volume resumes.
            autoplayMutedRef.current = false;
          });
        }, 400);
      });
    };


    if (Hls.isSupported()) {
      // isMobile already declared above (used by skip timer + frozen threshold)
      const hls = new Hls({
        enableWorker:  true,
        // Low-latency mode trims buffers to the bone to stay as close to
        // the live edge as possible — great on a stable PC connection,
        // but on mobile data/WiFi the slightest jitter then drains the
        // buffer instantly and causes the loading→play→loading loop.
        // Disable it on mobile and trade a couple of seconds of extra
        // latency for a buffer big enough to absorb network hiccups.
        // Also disabled on desktop for live IPTV where the server may be
        // under heavy visitor load — stability > latency.
        lowLatencyMode: false,

        // Prefetch the first fragment before playback starts — this cuts
        // the initial "loading" window noticeably on all platforms since
        // the player starts downloading media alongside the manifest parse.
        startFragPrefetch: true,

        // ── Buffer sizing ─────────────────────────────────────────────
        // Bigger buffers absorb the jitter from busy IPTV servers and
        // high visitor counts. The key symptom "works in VLC but blank
        // here" is almost always a buffer that's too shallow.
        backBufferLength:    isMobile ? 15 :  12,
        maxBufferLength:     isMobile ? 60 :  40,
        maxMaxBufferLength:  isMobile ? 120 : 60,
        maxBufferSize:       isMobile ? 50_000_000 : 30_000_000, // 50 MB / 30 MB
        maxBufferHole:       isMobile ? 1.5 : 1.0,

        // ── Quality / ABR ─────────────────────────────────────────────
        startLevel:          -1,
        capLevelToPlayerSize: true,
        // Higher initial BW estimate = picks a better quality level on
        // first play instead of starting at the lowest rendition.
        abrEwmaDefaultEstimate: isMobile ? 800_000 : 2_500_000,
        // Less twitchy ABR — fewer quality switches means fewer rebuffer
        // blips, especially important on loaded servers.
        abrBandWidthFactor:   isMobile ? 0.80 : 0.88,
        abrBandWidthUpFactor: isMobile ? 0.60 : 0.65,
        abrEwmaFastLive:  isMobile ? 3.0 : 4.0,
        abrEwmaSlowLive:  isMobile ? 9.0 : 9.0,

        // ── Stall / nudge ─────────────────────────────────────────────
        // Long starvation delays = wait for slow server instead of skipping.
        // This is the single most important setting for "works in VLC but
        // blank here" — VLC waits ~30s, we should wait nearly as long.
        maxStarvationDelay:  isMobile ? 16 : 12,
        maxLoadingDelay:     isMobile ? 16 : 12,
        nudgeOffset:         isMobile ? 0.08 : 0.1,
        nudgeMaxRetry:       isMobile ? 30 : 20,
        highBufferWatchdogPeriod: isMobile ? 6 : 4,

        // ── Fragment loading ──────────────────────────────────────────
        // More retries + longer timeouts for slow/shared IPTV servers.
        fragLoadingMaxRetry:        12,
        manifestLoadingMaxRetry:    8,
        levelLoadingMaxRetry:       8,
        fragLoadingRetryDelay:      500,
        manifestLoadingRetryDelay:  500,
        levelLoadingRetryDelay:     500,
        fragLoadingMaxRetryTimeout: 8000,
        manifestLoadingTimeout:     15000,
        levelLoadingTimeout:        15000,
        fragLoadingTimeOut:         20000,

        // ── Live sync ─────────────────────────────────────────────────
        liveSyncDurationCount:       isMobile ? 4 : 3,
        liveMaxLatencyDurationCount: isMobile ? 12 : 8,
        maxFragLookUpTolerance: isMobile ? 0.5 : 0.3,
        liveDurationInfinity: false,

        // Progressive loading: start playing as soon as first fragments arrive.
        progressive: true,
      });
      hlsRef.current = hls;
      hls.loadSource(channel.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        attemptAutoplay(video, isManualSelect);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetries < MAX_NETWORK_RETRIES) {
                networkRetries++;
                // Exponential back-off with longer initial delay for loaded
                // servers: 800ms, 1.6s, 3.2s, 6.4s, 12.8s, 25.6s, 51.2s, 102.4s
                // VLC waits this long — we should too before giving up.
                window.setTimeout(() => hls.startLoad(), 800 * Math.pow(2, networkRetries - 1));
              } else {
                window.clearTimeout(skipTimer);
                setLoading(false);
                if (channel) onStreamError?.(channel);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (mediaRetries < MAX_MEDIA_RETRIES) {
                mediaRetries++;
                if (mediaRetries === 1) {
                  hls.recoverMediaError();
                } else {
                  // Second attempt: full swap — detach then re-attach media
                  hls.swapAudioCodec();
                  hls.recoverMediaError();
                }
              } else {
                window.clearTimeout(skipTimer);
                setLoading(false);
                if (channel) onStreamError?.(channel);
              }
              break;
            default:
              window.clearTimeout(skipTimer);
              setLoading(false);
              if (channel) onStreamError?.(channel);
          }
        } else {
          // Non-fatal: buffer stall nudge — HLS will nudge internally,
          // but we also schedule a live-edge snap for safety
          if (data.details === "bufferStalledError" || data.details === "bufferNudgeOnStall") {
            scheduleRecover(500, false);
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari/iOS)
      //
      // iOS Safari behaviour:
      //   • Muted autoplay is always allowed (even without a gesture).
      //   • Unmuted autoplay requires a prior user gesture — stored as
      //     revtv:gestureGranted in localStorage (survives Ctrl+R / reload).
      //
      // Strategy — same flow as Android/PC via attemptAutoplay:
      //   MANUAL CHANNEL TAP : fresh gesture → unmuted directly, no overlay.
      //   FIRST VISIT        : load muted → overlay → user tap → sound + grant stored.
      //   ANY OTHER RELOAD   : grant exists → load muted → auto-unmute in .then().
      //   (Ctrl+R, logo tap, swipe-refresh — all identical.)
      //
      // Why wait for loadedmetadata:
      //   Calling play() immediately after .src= on iOS can return a promise
      //   that resolves before the media engine is ready, causing muted state
      //   to be silently dropped. loadedmetadata guarantees the element is
      //   ready to accept play() reliably.
      //   Fallback: if loadedmetadata hasn't fired in 4 s, call play() anyway
      //   (some streams are slow to deliver initial metadata on iOS).
      video.src = channel.url;
      video.load();
      let iosMetaFired = false;
      const onMeta = () => {
        if (iosMetaFired) return;
        iosMetaFired = true;
        video.removeEventListener("loadedmetadata", onMeta);
        iosMetaCleanup = null;
        attemptAutoplay(video, isManualSelect);
      };
      const iosMetaFallback = window.setTimeout(() => {
        if (!iosMetaFired) onMeta();
      }, 4000);
      iosMetaCleanup = () => {
        video.removeEventListener("loadedmetadata", onMeta);
        window.clearTimeout(iosMetaFallback);
      };
      video.addEventListener("loadedmetadata", onMeta);
    } else {
      window.clearTimeout(skipTimer);
      setError("HLS not supported on this browser.");
      setLoading(false);
    }

    return () => {
      window.clearTimeout(skipTimer);
      window.clearTimeout(loadingTimer);
      window.clearTimeout(recoverTimer);
      window.clearTimeout(waitingTimer);
      window.clearInterval(frozenWatchdog);
      // Clean up iOS loadedmetadata listener if the channel changed before
      // metadata arrived (prevents attemptAutoplay firing on the old channel).
      iosMetaCleanup?.();
      // Release the autoplay-muted guard so the sync-volume effect
      // is not stuck blocked on the next channel load.
      autoplayMutedRef.current = false;
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("pause",   onPause);
      video.removeEventListener("ended",   onEnded);
      video.removeEventListener("error",   onError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      // Keep video.src intact so the last frame stays visible during
      // the channel handoff — prevents the black-screen flash.
      video.pause();
    };
  }, [channel?.id, channel?.url]);

  // ── Background preloader effect ──────────────────────────────────────────
  // Silently pre-buffers the next channel so switching to it is near-instant.
  //
  // HOW IT AVOIDS HURTING MAIN PLAYBACK:
  //   1. Waits 5s after the main channel starts playing before starting.
  //   2. Uses the absolute lowest quality (startLevel:0), tiny buffers, and
  //      a minimal bandwidth estimate — it competes as little as possible.
  //   3. Stops ALL downloading (hls.stopLoad()) after 8s of prefetch, so it
  //      never hogs bandwidth once the initial fragments are in memory.
  //   4. The hidden <video> is always muted, never plays audio.
  //   5. Torn down immediately the moment the main channel changes.
  useEffect(() => {
    const preloadVideo = preloadVideoRef.current;

    // Clear any pending timers and tear down the previous preloader.
    const teardown = () => {
      if (preloadTimerRef.current) { window.clearTimeout(preloadTimerRef.current); preloadTimerRef.current = null; }
      if (preloadStopRef.current)  { window.clearTimeout(preloadStopRef.current);  preloadStopRef.current  = null; }
      if (preloadHlsRef.current)   { preloadHlsRef.current.destroy(); preloadHlsRef.current = null; }
      if (preloadVideo) { preloadVideo.src = ""; preloadVideo.load(); }
    };

    teardown(); // always reset when channel or nextChannel changes

    if (!nextChannel || !preloadVideo) return;
    // Don't preload if it's the same as the current channel (edge case)
    if (channel && nextChannel.id === channel.id) return;
    // Don't preload on iOS native HLS — the hidden video.src= assignment
    // can trigger the browser to allocate a native AVPlayer instance and
    // fight for the same decoder resources as the main video. hls.js
    // runs fine in a hidden element on Chrome/Android/desktop.
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
    if (isIOS || !Hls.isSupported()) return;

    // Wait 5 seconds after channel mount before starting preload.
    // This gives the main player time to fully stabilise before we
    // add any background network activity.
    preloadTimerRef.current = window.setTimeout(() => {
      preloadTimerRef.current = null;

      const hls = new Hls({
        enableWorker: true,
        // ── Quality: lock to the lowest rendition ──────────────────────
        startLevel: 0,             // lowest quality only — saves bandwidth
        autoStartLoad: true,
        capLevelToPlayerSize: false,
        // ── Tiny buffer — just enough for a fast start, nothing more ───
        maxBufferLength:    4,     // only 4 s ahead
        maxMaxBufferLength: 6,
        backBufferLength:   0,
        maxBufferSize:      3_000_000, // 3 MB cap
        // ── Low bandwidth estimate — won't try high bitrates ───────────
        abrEwmaDefaultEstimate: 200_000,
        // ── Skip low-latency and progressive modes ─────────────────────
        lowLatencyMode: false,
        progressive: false,
        // ── Fewer retries — this is background, failures are fine ──────
        fragLoadingMaxRetry: 2,
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
        // ── Live sync ──────────────────────────────────────────────────
        liveSyncDurationCount: 2,
      });

      preloadHlsRef.current = hls;
      preloadVideo.muted  = true;   // always silent
      preloadVideo.volume = 0;

      hls.loadSource(nextChannel.url);
      hls.attachMedia(preloadVideo);

      // After 8 seconds of prefetch, stop all fragment downloads.
      // The manifest + first few fragments are now in memory — that's
      // all we need for a fast start when the user switches to this channel.
      preloadStopRef.current = window.setTimeout(() => {
        preloadStopRef.current = null;
        if (preloadHlsRef.current) {
          preloadHlsRef.current.stopLoad();
        }
      }, 8000);

      // On any fatal error, just silently tear down the preloader.
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) teardown();
      });
    }, 5000);

    return teardown;
  }, [channel?.id, nextChannel?.id, nextChannel?.url]);

  // sync volume
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // While autoplay-muted is active (overlay showing or grant-unmute
    // in-flight) do NOT override v.muted — the HLS effect and doUnmute
    // own the muted state during that window.
    if (autoplayMutedRef.current) {
      v.volume = volume;
      return;
    }
    v.muted = muted;
    v.volume = volume;
  }, [volume, muted]);

  // ---- session activity tracking ----
  // Any interaction (click/tap/key/scroll) marks the session as active,
  // resetting the 10-minute inactivity clock used by utils/persist.ts.
  // Throttled so we're not writing to sessionStorage on every pixel of
  // scroll — once every few seconds is plenty.
  useEffect(() => {
    let lastMark = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastMark < 5000) return;
      lastMark = now;
      markActivity();
    };
    const opts = { passive: true } as AddEventListenerOptions;
    window.addEventListener("pointerdown", onActivity, opts);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, opts);
    window.addEventListener("wheel", onActivity, opts);
    // Record initial activity for this load too.
    onActivity();
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      window.removeEventListener("wheel", onActivity);
    };
  }, []);

  // apply brightness as video filter
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.style.filter = `brightness(${brightness})`;
  }, [brightness]);

  // ---- device / fullscreen sync ----
  useEffect(() => {
    const detectMobile = () => {
      const mobile =
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
      setIsMobileDevice(mobile);
    };

    const onChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const inFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      setIsFullscreen(inFs);
      // If native fullscreen is now active, clear the fallback override
      if (inFs) setFsOverride(false);
    };

    detectMobile();
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as any);
    window.addEventListener("resize", detectMobile);

    // iOS / Android fires these on the <video> element when the native
    // fullscreen player enters/exits. We sync our React state and clean
    // up the controls attribute (we add it for the fullscreen call,
    // remove it when returning to the inline player).
    const video = videoRef.current as (HTMLVideoElement & {
      webkitbeginfullscreen?: () => void;
      webkitendfullscreen?: () => void;
    }) | null;
    const onBegin = () => {
      setIsFullscreen(true);
      setFsOverride(false);
    };
    const onEnd = () => {
      setIsFullscreen(false);
      // Clean up: remove the controls attribute we added for the
      // fullscreen call, so the inline player has no native controls
      // overlapping with our custom UI.
      try {
        if (video && video.hasAttribute("controls")) {
          video.removeAttribute("controls");
        }
      } catch {}
      // Unlock orientation if we locked it
      try {
        const so = (screen as any).orientation;
        if (so && typeof so.unlock === "function") so.unlock();
      } catch {}
    };
    if (video) {
      video.addEventListener("webkitbeginfullscreen", onBegin as any);
      video.addEventListener("webkitendfullscreen", onEnd as any);
    }

    // No auto-seek on tab-visible — viewer controls when to go live.
    const onVisibilityChange = () => {};
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("webkitfullscreenchange", onChange as any);
      window.removeEventListener("resize", detectMobile);
      if (video) {
        video.removeEventListener("webkitbeginfullscreen", onBegin as any);
        video.removeEventListener("webkitendfullscreen", onEnd as any);
      }
    };
  }, []);

  // When entering mobile fullscreen: lock body + html scroll, remove any
  // margins/padding, and best-effort request landscape orientation.
  useEffect(() => {
    if (!isFullscreen && !fsOverride) return;
    const html = document.documentElement;
    const previous = {
      bodyOverflow: document.body.style.overflow,
      htmlOverflow: html.style.overflow,
      bodyMargin: document.body.style.margin,
      bodyPadding: document.body.style.padding,
      bodyBg: document.body.style.backgroundColor,
    };
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.backgroundColor = "#000";
    return () => {
      document.body.style.overflow = previous.bodyOverflow;
      html.style.overflow = previous.htmlOverflow;
      document.body.style.margin = previous.bodyMargin;
      document.body.style.padding = previous.bodyPadding;
      document.body.style.backgroundColor = previous.bodyBg;
      try {
        const so = (screen as any).orientation;
        if (so && typeof so.unlock === "function") {
          so.unlock();
        }
      } catch {}
    };
  }, [isFullscreen, fsOverride]);

  // ---- controls auto hide ----
  const armHide = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
    setControlsVisible(true);
    hideTimerRef.current = window.setTimeout(() => {
      if (playing) setControlsVisible(false);
    }, 5000);
  }, [playing]);

  useEffect(() => {
    armHide();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [armHide, playing]);

  // ---- actions ----
  // Tracks the last time we snapped to live edge — prevents spamming seeks.
  const lastLiveSnapRef = useRef<number>(0);

  // Called by the ● LIVE button — always jumps to the absolute live edge
  // with no debounce. Seeks to live edge and ALWAYS resumes — never pauses.
  const jumpToLiveEdge = useCallback(() => {
    const v = videoRef.current;
    const hls = hlsRef.current;
    if (!v) return;
    let liveEdge: number | null = null;
    if (hls && hls.liveSyncPosition != null && isFinite(hls.liveSyncPosition)) {
      liveEdge = hls.liveSyncPosition;
    } else if (v.seekable.length > 0) {
      const end = v.seekable.end(v.seekable.length - 1);
      if (isFinite(end)) liveEdge = end;
    }
    if (liveEdge != null) {
      lastLiveSnapRef.current = Date.now();
      v.currentTime = liveEdge;
    }
    // Always ensure playing — seeking must never pause the stream.
    if (v.paused) {
      userPausedRef.current = false;
      v.play().catch(() => {});
    }
  }, []);

  const syncToLiveEdge = useCallback(() => {
    const v = videoRef.current;
    const hls = hlsRef.current;
    if (!v) return;
    const now = Date.now();
    if (now - lastLiveSnapRef.current < 3_000) return; // debounce 3s
    let liveEdge: number | null = null;
    if (hls && hls.liveSyncPosition != null && isFinite(hls.liveSyncPosition)) {
      liveEdge = hls.liveSyncPosition;
    } else if (v.seekable.length > 0) {
      const end = v.seekable.end(v.seekable.length - 1);
      if (isFinite(end)) liveEdge = end;
    }
    if (liveEdge == null) return;
    if (liveEdge - v.currentTime > 3) { // snap if >3s behind live
      lastLiveSnapRef.current = now;
      v.currentTime = liveEdge;
    }
  }, []);

  // Live-edge keeper: runs every 5s, snaps if >3s behind live edge.
  useEffect(() => {
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || v.seeking || userPausedRef.current) return;
      const hls = hlsRef.current;
      const now = Date.now();
      if (now - lastLiveSnapRef.current < 3_000) return;
      let liveEdge: number | null = null;
      if (hls && hls.liveSyncPosition != null && isFinite(hls.liveSyncPosition)) {
        liveEdge = hls.liveSyncPosition;
      } else if (v.seekable.length > 0) {
        const end = v.seekable.end(v.seekable.length - 1);
        if (isFinite(end)) liveEdge = end;
      }
      if (liveEdge == null) return;
      if (liveEdge - v.currentTime > 3) {
        lastLiveSnapRef.current = now;
        v.currentTime = liveEdge;
      }
    }, 5_000);
    return () => window.clearInterval(id);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPausedRef.current = false;
      setUserPaused(false);
      // On resume: jump to live edge so viewer gets the latest stream
      syncToLiveEdge();
      v.play().catch(() => {});
    } else {
      // Set the ref BEFORE calling pause() — the 'pause' event fires
      // synchronously inside pause() on some Android browsers, so the
      // ref must already be true when onPause checks it.
      userPausedRef.current = true;
      setUserPaused(true);
      v.pause();
    }
    armHide();
  }, [armHide, syncToLiveEdge]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    const newMuted = !mutedRef.current;
    // Update the DOM immediately — don't wait for the React re-render cycle.
    // This prevents the 1-frame window where the button shows one state but
    // the video element is still in the opposite state (the "stuck icon" bug).
    if (v) {
      v.muted = newMuted;
      if (!newMuted) v.volume = volumeRef.current || 1;
    }
    mutedRef.current = newMuted;
    setMuted(newMuted);
    // Also hide the overlay immediately if user taps mute while it's showing
    // (shouldn't normally happen, but belt-and-suspenders)
    if (!newMuted) dismissUnmuteOverlay(true);
    armHide();
  }, [armHide]);



  const changeVolume = useCallback(
    (val: number) => {
      const newVol = Math.round(Math.max(0, Math.min(1, val)) * 100) / 100;
      setVolume(newVol);
      if (newVol > 0 && muted) setMuted(false);
    },
    [muted]
  );

  // PC: hovering the speaker icon and scrolling the mouse wheel acts
  // as a volume +/- control. Attached as a native (non-passive)
  // listener so preventDefault reliably stops page scroll.
  useEffect(() => {
    const el = volumeWheelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = 0.05;
      const current = muted ? 0 : volume;
      const next = Math.round(Math.max(0, Math.min(1, current + (e.deltaY < 0 ? step : -step))) * 100) / 100;
      setVolume(next);
      if (next > 0 && muted) setMuted(false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [volume, muted]);

  const toggleFullscreen = useCallback(async () => {
    const video = videoRef.current as HTMLVideoElement | null;
    const container = containerRef.current as (HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    }) | null;

    if (!container) return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };

    // Detect iOS — it has special fullscreen handling
    const isIOS =
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));

    // ---- iOS: use webkitEnterFullscreen on the <video> element.
    // This is iOS Safari's ONLY reliable fullscreen path — the standard
    // Fullscreen API only works on iframes/regular elements, and iOS
    // forces the native video player. This gives true fullscreen with
    // no URL bar, no browser chrome, and proper iOS-style controls.
    if (isMobileDevice && isIOS && video) {
      const v = video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
        webkitExitFullscreen?: () => void;
        webkitDisplayingFullscreen?: boolean;
      };
      // iOS requires the controls attribute for webkitEnterFullscreen
      const hadControls = v.hasAttribute("controls");
      if (!hadControls) v.setAttribute("controls", "");
      v.setAttribute("playsinline", "");

      try {
        if (v.webkitDisplayingFullscreen) {
          v.webkitExitFullscreen?.();
        } else {
          v.webkitEnterFullscreen?.();
        }
      } catch {}
      // Clean up controls after the native player has had time to
      // capture the attribute
      if (!hadControls) {
        window.setTimeout(() => {
          try {
            v.removeAttribute("controls");
          } catch {}
        }, 300);
      }
      armHide();
      return;
    }

    // ---- Android mobile: use the standard Fullscreen API on the
    // container. This keeps OUR custom UI and 5-second auto-hide timer
    // visible, with the aspect ratio button, play/pause, volume, swipe
    // gestures, and everything else. The native player
    // (webKitEnterFullscreen) is NOT used because it replaces the entire
    // <video> with a 10-second-controls native player and hides our UI.
    //
    // Must be called from a user gesture.
    if (isMobileDevice && video) {
      const v = video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
        webkitExitFullscreen?: () => void;
        webkitDisplayingFullscreen?: boolean;
      };
      // Ensure the video has playsinline for iOS inline playback
      v.setAttribute("playsinline", "");

      // Detect if we're in any kind of fullscreen BEFORE showing overlay
      const inContainerFs = !!(
        doc.fullscreenElement === container ||
        doc.webkitFullscreenElement === container
      );
      const inVideoFs = !!(
        doc.fullscreenElement === video ||
        doc.webkitFullscreenElement === video
      );
      const isInFs = inContainerFs || inVideoFs;

      // Show a transition overlay so the user doesn't see a black
      // flash on Android while the native fullscreen player loads.
      setFsTransitioning(isInFs ? "exiting" : "entering");
      window.setTimeout(() => setFsTransitioning(null), 800);

      if (isInFs) {
        // Exit: use the standard API
        try {
          if (doc.exitFullscreen) await doc.exitFullscreen();
          else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
        } catch {}
        // Unlock orientation
        try {
          const so = (screen as any).orientation;
          if (so && typeof so.unlock === "function") so.unlock();
        } catch {}
      } else {
        // Enter: use the standard Fullscreen API on the container.
        // This keeps our custom UI visible on top of the video.
        let entered = false;
        try {
          if (container.requestFullscreen) {
            await container.requestFullscreen({ navigationUI: "hide" });
            entered = true;
          } else if (container.webkitRequestFullscreen) {
            await container.webkitRequestFullscreen();
            entered = true;
          }
        } catch {}
        // Fallback: try the video element itself
        if (!entered) {
          try {
            if ((video as any).requestFullscreen) {
              await (video as any).requestFullscreen({ navigationUI: "hide" });
              entered = true;
            }
          } catch {}
        }
        // Best-effort landscape lock on mobile
        if (entered) {
          try {
            const so = (screen as any).orientation;
            if (so && typeof so.lock === "function") {
              so.lock("landscape").catch(() => {});
            }
          } catch {}
        }
      }
      armHide();
      return;
    }

    // ---- All other devices (Android, desktop) ----
    // Try a cascade of fullscreen methods. The native Fullscreen API on
    // the container is the most reliable on Android Chrome. If that
    // fails (e.g. inside an iframe preview), fall back to the video
    // element's requestFullscreen. If that also fails, force the
    // position:fixed overlay via state (handled by the isFullscreen
    // state which is also set below) to at least cover the viewport.
    // ---- All devices (Android, desktop) ----
    // Try native Fullscreen API. If it fails (e.g. inside an iframe),
    // fall back to our own fixed overlay via fsOverride.
    const inFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);

    if (inFs) {
      setFsTransitioning("exiting");
      window.setTimeout(() => setFsTransitioning(null), 700);
      try {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } catch {}
      setFsOverride(false);
      armHide();
      return;
    }

    setFsTransitioning("entering");
    window.setTimeout(() => setFsTransitioning(null), 700);

    // ---- Desktop: use the standard Fullscreen API on the container.
    // This keeps our custom UI and 5-second auto-hide timer visible.
    let fsWorked = false;
    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen({ navigationUI: "hide" });
        fsWorked = true;
      } else if (container.webkitRequestFullscreen) {
        await container.webkitRequestFullscreen();
        fsWorked = true;
      } else if ((video as any)?.requestFullscreen) {
        await (video as any).requestFullscreen({ navigationUI: "hide" });
        fsWorked = true;
      } else if ((video as any)?.webkitRequestFullscreen) {
        await (video as any).webkitRequestFullscreen();
        fsWorked = true;
      }
    } catch {}

    if (fsWorked) {
      setFsOverride(false);
    } else {
      // All native methods failed — force our own fixed overlay
      setFsOverride((prev) => !prev);
    }
    armHide();
  }, [armHide]);

  // ---- MOBILE GESTURES (fullscreen only) ----
  useEffect(() => {
    const el = gestureLayerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (!isMobileDevice || !presentationFullscreen) {
        touchStart.current = null;
        return;
      }
      const t = e.touches[0];
      const rect = el.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const side: "left" | "right" = x < rect.width / 2 ? "left" : "right";
      touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
      isSwiping.current = false;
      gestureState.current = {
        startX: t.clientX,
        startY: t.clientY,
        startValue: side === "left" ? brightness : volume,
        side,
        active: false,
        locked: false,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isMobileDevice || !presentationFullscreen || !touchStart.current) return;
      const t = e.touches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      if (
        !gestureState.current.locked &&
        Math.abs(dy) > 10 &&
        Math.abs(dy) > Math.abs(dx) * 1.2
      ) {
        gestureState.current.locked = true;
        gestureState.current.active = true;
        isSwiping.current = true;
      }
      if (!gestureState.current.active) return;
      e.preventDefault();
      const newVal =
        gestureState.current.startValue +
        (gestureState.current.startY - t.clientY) / 200;

      if (gestureState.current.side === "left") {
        const b = Math.max(0.1, Math.min(1, newVal));
        setBrightness(b);
        setGestureLevel({ type: "brightness", value: b, visible: true });
      } else {
        const v = Math.max(0, Math.min(1, newVal));
        changeVolume(v);
        setGestureLevel({ type: "volume", value: v, visible: true });
      }
    };

    const handleTouchEnd = () => {
      if (!touchStart.current) return;
      if (gestureState.current.active) {
        gestureState.current.active = false;
        setTimeout(() => {
          if (!gestureState.current.active) {
            setGestureLevel((g) => ({ ...g, visible: false }));
          }
        }, 500);
      }
      touchStart.current = null;
      setTimeout(() => {
        isSwiping.current = false;
      }, 90);
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [brightness, volume, isMobileDevice, presentationFullscreen, changeVolume]);

  // ---- Keyboard shortcuts (desktop only) ----
  // Keyboard shortcuts (desktop only):
  //   SPACE        — play/pause
  //   M            — mute/unmute
  //   F            — fullscreen toggle
  //   ArrowUp      — volume up
  //   ArrowDown    — volume down
  // Only active when the player is mounted and there's a channel.
  useEffect(() => {
    if (!channel) return;
    const onKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      // Ignore if a modifier key is pressed (so browser shortcuts work)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === " " || key === "spacebar") {
        e.preventDefault();
        togglePlay();
      } else if (key === "m") {
        e.preventDefault();
        toggleMute();
      } else if (key === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (key === "c") {
        // Cycle aspect ratio (contain → cover → fill → native)
        e.preventDefault();
        cycleAspect();
      } else if (key === "arrowup") {
        // Volume up — increments by 5% per press, unmutes if muted
        e.preventDefault();
        setMuted(false);
        setVolume((prev) => Math.min(1, Math.round((prev + 0.05) * 100) / 100));
      } else if (key === "arrowdown") {
        // Volume down — decrements by 5% per press, mutes when 0
        e.preventDefault();
        setVolume((prev) => {
          const next = Math.max(0, Math.round((prev - 0.05) * 100) / 100);
          if (next === 0) setMuted(true);
          return next;
        });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [channel, togglePlay, toggleMute, toggleFullscreen]);

  // Tap-to-unmute: called when user taps the glass overlay (ALL platforms).
  // Syncs DOM immediately, stores grant, triggers fade-out animation on overlay.
  const doUnmute = useCallback(() => {
    // Clear the autoplay-muted guard BEFORE writing v.muted so the
    // sync-volume effect (if it fires) does not immediately re-mute.
    autoplayMutedRef.current = false;
    recentAutoUnmuteRef.current = 0;
    const v = videoRef.current;
    if (v) {
      v.muted = false;
      v.volume = volumeRef.current || 1;
      if (v.paused) v.play().catch(() => {});
    }
    mutedRef.current = false;
    setMuted(false);
    // Fade out the overlay quickly (180ms) then remove it from DOM
    dismissUnmuteOverlay(false);
    try { window.localStorage.setItem("revtv:gestureGranted", "1"); } catch {}

    // This tap is the very first genuine, trusted click the browser has
    // seen on this site — the only way to satisfy a browser's "navigated
    // by a user gesture" autoplay exception, since a script can never fake
    // a real click. Immediately follow it with ONE same-URL navigation,
    // exactly like a logo tap. This gives the browser a real "played with
    // sound right after a gesture-driven navigation" data point for this
    // origin, which is what lets plain reloads (Ctrl+R, the reload button,
    // swipe-to-refresh) start autoplaying with sound directly afterwards —
    // same as a manual logo tap always could. Runs once ever per browser.
    //
    // SKIPPED on iOS: iOS Safari's autoplay rules work differently —
    // the primedOnce navigation causes the page to reload and then
    // immediately show "Tap to Unmute" again (glitchy loop). On iOS we
    // simply store the grant and let the user tap to unmute on each hard
    // reload (iOS always requires a gesture for unmuted autoplay anyway).
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
    if (!isIOS) {
      try {
        if (window.localStorage.getItem("revtv:primedOnce") !== "1") {
          window.localStorage.setItem("revtv:primedOnce", "1");
          window.location.href = window.location.origin + window.location.pathname;
        }
      } catch {}
    }
  }, [dismissUnmuteOverlay]);

  const onVideoClick = (e: ReactMouseEvent) => {
    if (isSwiping.current) return;
    e.stopPropagation();
    // If iOS needs a tap to start, any tap on the player triggers it
    if (needsUnmute) { doUnmute(); return; }
    togglePlay();
  };

  const onVideoDoubleClick = (e: ReactMouseEvent) => {
    if (isSwiping.current) return;
    e.stopPropagation();
    toggleFullscreen();
  };

  // The player is always rendered inline. When "fullscreen" mode is active,
  // we make it a fixed-position full-viewport overlay using CSS only. This
  // keeps the <video> element in the same place across fullscreen toggles,
  // so the HLS stream keeps playing without remounting (which is what was
  // causing the black screen on mobile).
  const containerClass = cn(
    "group/player relative w-full overflow-hidden bg-black transition-[border-radius,box-shadow] duration-300",
    presentationFullscreen
      ? // Fullscreen: cover the entire viewport with multiple fallback
        // units. 100dvh/dvw are ideal, 100vh/vw cover older browsers,
        // and env(safe-area-*) handles notched devices. The z-[2147483646]
        // ensures it sits above everything. No border, no rounding, no shadow.
        "fixed inset-0 z-[2147483646] h-[100dvh] h-[100vh] w-[100dvw] w-[100vw] rounded-none border-0 shadow-none"
      : // Inline: rounded card with subtle border
        "mx-auto rounded-2xl border border-white/10 aspect-video max-h-[80vh] shadow-2xl shadow-violet-900/10"
  );
  const containerStyle: CSSProperties = {
    // In fullscreen on Android, use pure black so the area behind the
    // video letterbox/pillarbox borders is clean black, not purple gradient.
    // On iOS and inline (non-fullscreen), keep the branded dark purple gradient.
    background: presentationFullscreen
      ? "#000000"
      : "linear-gradient(160deg,#0d0520 0%,#060112 40%,#09021a 70%,#050010 100%)",
    touchAction: presentationFullscreen ? "none" : "manipulation",
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={armHide}
      onMouseLeave={() => { if (playing) armHide(); }}
      // Show controls on any touch on mobile (anywhere in the player).
      // The touch then re-hides after 5s via armHide.
      onTouchStart={(e) => {
        if (!isMobileDevice) return;
        // Don't show controls on tap of the gesture layer (the video area
        // itself). Tap on controls is handled by their own onClick.
        const target = e.target as HTMLElement;
        if (target.closest("[data-player-control]")) return;
        armHide();
      }}
      className={containerClass}
      style={containerStyle}
    >
      {channel ? (
        <>
          <video
            ref={videoRef}
            onClick={onVideoClick}
            onDoubleClick={onVideoDoubleClick}
            className="h-full w-full cursor-pointer"
            playsInline
            // @ts-ignore - webkit-playsinline is iOS-specific
            webkit-playsinline="true"
            style={{
              objectFit:
                aspectMode === "contain"
                  ? "contain"
                  : aspectMode === "cover"
                  ? "cover"
                  : aspectMode === "fill"
                  ? "fill"
                  : "none",
              transition: "object-fit 300ms ease",
            }}
          />
          {/* Hidden background preloader video — muted, off-screen, zero size.
              Preloads the next channel's manifest + first fragments so
              switching to it is near-instant. Never affects main playback. */}
          <video
            ref={preloadVideoRef}
            muted
            playsInline
            // @ts-ignore
            webkit-playsinline="true"
            aria-hidden="true"
            style={{
              position: "absolute",
              width: 0,
              height: 0,
              opacity: 0,
              pointerEvents: "none",
              visibility: "hidden",
            }}
          />
          {/* On mobile in fullscreen, a transparent gesture layer captures taps
              so the native <video> element doesn't steal them. The center
              play button (z-10) still receives clicks on top of this layer. */}
          {isMobileDevice && presentationFullscreen && (
            <div
              ref={gestureLayerRef}
              className="absolute inset-0 z-[3]"
              style={{ touchAction: "none" }}
            />
          )}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-white/40"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <p className="text-sm text-white/50">Select a channel to start watching</p>
          </div>
        </div>
      )}

      {/* Loading — fades in so channel switches never flash dark */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40"
          style={{ animation: "fadeInOverlay 200ms ease forwards" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/80" />
            <span className="text-xs font-medium uppercase tracking-widest text-white/60">
              Loading
            </span>
          </div>
        </div>
      )}

      {/* Paused overlay — light glass blur over the still-visible frame,
          with an iOS-style frosted play button that scales/fades in
          smoothly. Clicking anywhere resumes playback. Hidden while
          loading/transitioning so it doesn't fight those overlays. */}
      {channel && userPaused && !loading && !error && !fsTransitioning && !needsUnmute && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[2px]"
          style={{ animation: "iosOverlayFade 380ms cubic-bezier(.4,0,.2,1) both" }}
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          onDoubleClick={onVideoDoubleClick}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            aria-label="Play"
            data-player-control
            className="group flex h-16 w-16 items-center justify-center rounded-full border text-white transition-[transform,background-color] duration-300 ease-out hover:scale-[1.06] active:scale-95 sm:h-[72px] sm:w-[72px]"
            style={{
              animation: "iosGlassPop 480ms cubic-bezier(.22,1,.36,1) both",
              background: "rgba(255,255,255,0.14)",
              borderColor: "rgba(255,255,255,0.28)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-1 transition-transform duration-300 ease-out group-hover:scale-110 sm:h-7 sm:w-7"
              style={{ animation: "iosIconFade 420ms cubic-bezier(.22,1,.36,1) 60ms both" }}
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        </div>
      )}

      {/* Fullscreen-transition overlay — covers the brief black flash
          on Android between exiting the inline player and the native
          fullscreen player taking over. */}
      {fsTransitioning && (
        <div
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/85  transition-opacity duration-200"
          aria-hidden
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-10 w-10">
              <div
                className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
                style={{ borderTopColor: "rgba(255,255,255,0.9)" }}
              />
              <div
                className="absolute inset-1 animate-spin rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: "rgba(255,255,255,0.5)",
                  animationDirection: "reverse",
                  animationDuration: "1.2s",
                }}
              />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/70">
              {fsTransitioning === "exiting" ? "Exiting Fullscreen" : "Entering Fullscreen"}
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 ">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
            {error}
          </div>
        </div>
      )}

      {/* Status indicator — shows current volume / aspect ratio briefly
          when changed via keyboard (C, ArrowUp, ArrowDown), then fades
          out after 3 seconds. Sits at top-center of the player. */}
      {statusMessage && (
        <div
          className="pointer-events-none absolute inset-x-0 top-6 z-30 flex justify-center transition-opacity duration-500 sm:top-8"
          style={{ opacity: statusVisible ? 1 : 0 }}
          aria-hidden={!statusVisible}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-1.5 ">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {statusMessage.startsWith("Volume") ? (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </>
              ) : statusMessage === "Muted" ? (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </>
              ) : (
                /* Aspect ratio icon */
                <>
                  <path d="M3 8V5a2 2 0 0 1 2-2h3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </>
              )}
            </svg>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/90">
              {statusMessage}
            </span>
          </div>
        </div>
      )}

      {/* Gesture indicator - shown only during active swipe */}
      {gestureLevel.visible && gestureLevel.type && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/70 px-7 py-5 "
            style={{
              animation: "gesturePop 220ms cubic-bezier(.4,0,.2,1)",
            }}
          >
            {gestureLevel.type === "volume" ? (
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {volume === 0 || gestureLevel.value === 0 ? (
                  <>
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </>
                ) : (
                  <>
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </>
                )}
              </svg>
            ) : (
              <svg
                width="38"
                height="38"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white transition-all duration-100"
                style={{ width: `${gestureLevel.value * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
              {gestureLevel.type} • {Math.round(gestureLevel.value * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Tap-to-unmute overlay — ALL platforms (PC, Android, iOS).
          Only shown on first-ever visit. Blur + glass button, same style
          as the paused-play overlay. Tap anywhere to unmute + store grant.
          On tap: quick fade-out animation (180ms) then removed from DOM.
          On channel switch (manual): dismissed instantly, no animation. */}
      {needsUnmute && (
        <div
          className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); doUnmute(); }}
          style={{
            cursor: "pointer",
            /* iOS-glass backdrop: very light frost so video shows through clearly */
            backdropFilter: "blur(4px) saturate(130%) brightness(1.08)",
            WebkitBackdropFilter: "blur(4px) saturate(130%) brightness(1.08)",
            background: "rgba(255,255,255,0.06)",
            animation: unmuteFading
              ? "unmuteFadeOut 180ms cubic-bezier(.4,0,.2,1) both"
              : "iosOverlayFade 380ms cubic-bezier(.4,0,.2,1) both",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); doUnmute(); }}
              aria-label="Tap to unmute"
              data-player-control
              className="flex h-16 w-16 items-center justify-center rounded-full border text-white sm:h-[72px] sm:w-[72px]"
              style={{
                animation: "iosGlassPop 480ms cubic-bezier(.22,1,.36,1) both",
                background: "rgba(255,255,255,0.22)",
                borderColor: "rgba(255,255,255,0.45)",
                backdropFilter: "blur(20px) saturate(180%) brightness(1.15)",
                WebkitBackdropFilter: "blur(20px) saturate(180%) brightness(1.15)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.55)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: "iosIconFade 420ms cubic-bezier(.22,1,.36,1) 60ms both", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            </button>
            <span style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.07em",
              color: "rgba(255,255,255,0.92)",
              fontFamily: "'Inter', system-ui, sans-serif",
              textShadow: "0 1px 3px rgba(0,0,0,0.5)",
              animation: "iosIconFade 420ms cubic-bezier(.22,1,.36,1) 120ms both",
            }}>Tap to Unmute</span>
          </div>
        </div>
      )}

            {/* Top overlay (channel info) */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 transition-all duration-500 sm:p-5",
          controlsVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-2"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {channel && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); jumpToLiveEdge(); }}
                  title="Jump to live edge"
                  className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10 active:scale-95 cursor-pointer"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
                    Live
                  </span>
                </button>
                <h2 className="truncate text-sm font-semibold text-white sm:text-lg">
                  {channel.name}
                </h2>
                <p className="mt-0.5 truncate text-[10px] text-white/60 sm:text-xs">
                  {channel.group}
                </p>
              </>
            )}
          </div>
        </div>
      </div>



      {/* Bottom controls */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 transition-all duration-500 sm:p-5",
          controlsVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        )}
      >
        <div
          className="pointer-events-auto flex items-center gap-2 sm:gap-3"
          data-player-control
        >
          {/* Play/pause */}
          <button
            onClick={togglePlay}
            className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white  transition-all duration-300 hover:scale-110 hover:border-white/30 hover:bg-white/15 active:scale-95 sm:h-11 sm:w-11"
            aria-label={playing ? "Pause" : "Play"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={cn(
                "absolute ml-0.5 transition-all duration-300 ease-out group-hover:scale-110",
                playing
                  ? "scale-75 opacity-0"
                  : "scale-100 opacity-100"
              )}
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={cn(
                "absolute transition-all duration-300 ease-out group-hover:scale-110",
                playing
                  ? "scale-100 opacity-100"
                  : "scale-125 opacity-0"
              )}
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>

          {/* Volume — hover + scroll wheel to adjust on PC. Hidden when tap-to-unmute overlay is active */}
          <div ref={volumeWheelRef} className="group/vol flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white  transition-all duration-300 hover:scale-110 hover:border-white/30 hover:bg-white/15 active:scale-95 sm:h-11 sm:w-11"
              aria-label={muted ? "Unmute" : "Mute"}
              title="Scroll to adjust volume"
            >
              {muted || volume === 0 ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : volume < 0.5 ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
            {/* Volume slider — hidden on mobile, only visible on hover
                on desktop (lg+). Mobile uses gesture-based volume via
                the swipe-up/down controls. */}
            <div
              className="relative hidden h-1 w-0 overflow-hidden rounded-full transition-all duration-300 group-hover/vol:w-24 lg:block"
              style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${(muted ? 0 : volume) * 100}%`,
                  backgroundColor: "#ffffff",
                }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Volume"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Channel badge / name on fullscreen */}
            {presentationFullscreen && channel && (
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5  sm:flex">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                  Now Playing
                </span>
              </div>
            )}

            {/* Aspect ratio / crop / fill button.
                Glass effect, available on PC and Android.
                Cycles through: contain → cover (fill to screen, crops) →
                fill (stretch to screen) → native. Works in fullscreen too. */}
            <button
              onClick={cycleAspect}
              aria-label={`Aspect ratio: ${aspectMode}`}
              title={`Aspect: ${aspectMode} (click to change)`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white  transition-all duration-300 hover:scale-110 hover:border-white/30 hover:bg-white/15 active:scale-95 sm:h-11 sm:w-11"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Crop / expand icon - two arrows pointing in/out */}
                <path d="M3 8V5a2 2 0 0 1 2-2h3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
                {/* Inner rectangle showing the current mode */}
                <rect
                  x={aspectMode === "cover" ? 7 : 9}
                  y={aspectMode === "cover" ? 5 : 9}
                  width={aspectMode === "cover" ? 10 : 6}
                  height={aspectMode === "cover" ? 14 : 6}
                  rx="1"
                  strokeOpacity={aspectMode === "native" ? 0.4 : 0.9}
                  strokeDasharray={aspectMode === "fill" ? "2 2" : ""}
                />
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white  transition-all duration-300 hover:scale-110 hover:border-white/30 hover:bg-white/15 active:scale-95 sm:h-11 sm:w-11"
              aria-label={presentationFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {presentationFullscreen ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                  <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                  <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* lucide lucide-zap + Revenger pill */}
        <div className="mt-2.5 flex items-center gap-2 sm:mt-3">
          {/* Zap + Revenger */}
          <div
            className="flex items-center gap-1.5 rounded-full border px-2 py-0.5"
            style={{
              borderColor: "rgba(52,191,128,0.25)",
              backgroundColor: "rgba(52,191,128,0.10)",
            }}
          >
            <span className="relative inline-flex h-3 w-3 items-center justify-center">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#34bf80"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="lucide lucide-zap"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span
                className="absolute h-1 w-1 rounded-full"
                style={{
                  backgroundColor: "#34bf80",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 4px #34bf80",
                  animation: "zapDotPulse 1.2s ease-in-out infinite",
                }}
              />
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "#34bf80", fontFamily: "'Space Grotesk','Space Grotesk Fallback',sans-serif" }}
            >
              Revenger
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* Quick fade-out for the tap-to-unmute overlay when tapped */
        @keyframes unmuteFadeOut {
          0%   { opacity: 1; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
          100% { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
        }
        /* Zap dot pulse — the green dot overlaid on the zap icon
           pulses with a soft scale + opacity flicker. */
        @keyframes zapDotPulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.7); }
          50%      { opacity: 1;   transform: translate(-50%, -50%) scale(1.3); }
        }
        @keyframes gesturePop {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        /* iOS-glass style overlay fade — backdrop blur eases in smoothly. */
        @keyframes iosOverlayFade {
          0%   { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          100% { opacity: 1; }
        }
        /* iOS-glass style pop for the pause/play button — gentle
           scale + blur-in with a soft overshoot, no harsh bounce. */
        @keyframes iosGlassPop {
          0%   { opacity: 0; transform: scale(0.82); filter: blur(6px); }
          70%  { opacity: 1; transform: scale(1.05); filter: blur(0px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0px); }
        }
        /* Icon fades/sharpens in slightly after the glass shell. */
        @keyframes iosIconFade {
          0%   { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
