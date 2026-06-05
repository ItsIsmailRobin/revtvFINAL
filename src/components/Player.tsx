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

interface PlayerProps {
  channel: Channel | null;
}

interface GestureState {
  startX: number;
  startY: number;
  startValue: number;
  side: "left" | "right" | null;
  active: boolean;
  locked: boolean;
}

export default function Player({ channel }: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const gestureLayerRef = useRef<HTMLDivElement>(null);

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

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
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
  const [gestureLevel, setGestureLevel] = useState<{
    type: "volume" | "brightness" | null;
    value: number;
    visible: boolean;
  }>({ type: null, value: 0, visible: false });

  const presentationFullscreen = isFullscreen || fsOverride;

  // ---- HLS attach / detach ----
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel) return;

    setError(null);
    setLoading(true);
    setPlaying(false);

    const onPlaying = () => {
      setLoading(false);
      setPlaying(true);
    };
    const onWaiting = () => setLoading(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      setLoading(false);
      setError("Stream error. Please try another channel.");
    };
    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("pause", onPause);
    video.addEventListener("error", onError);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 8,
        maxMaxBufferLength: 30,
        maxBufferSize: 30 * 1000 * 1000,
        startLevel: -1,
        capLevelToPlayerSize: true,
        abrEwmaDefaultEstimate: 500000,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        progressive: true,
      });
      hlsRef.current = hls;
      hls.loadSource(channel.url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError("Cannot play this stream.");
              setLoading(false);
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = channel.url;
      video.play().catch(() => {});
    } else {
      setError("HLS not supported on this browser.");
      setLoading(false);
    }

    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("error", onError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [channel?.id, channel?.url]);

  // sync volume
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = volume;
  }, [volume, muted]);

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

    // iOS fires these on the <video> element when webkitEnterFullscreen is used
    const video = videoRef.current as (HTMLVideoElement & {
      webkitbeginfullscreen?: () => void;
      webkitendfullscreen?: () => void;
    }) | null;
    const onBegin = () => setIsFullscreen(true);
    const onEnd = () => setIsFullscreen(false);
    if (video) {
      video.addEventListener("webkitbeginfullscreen", onBegin as any);
      video.addEventListener("webkitendfullscreen", onEnd as any);
    }

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
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
    }, 3200);
  }, [playing]);

  useEffect(() => {
    armHide();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [armHide, playing]);

  // ---- actions ----
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    armHide();
  }, [armHide]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
    armHide();
  }, [armHide]);

  const changeVolume = useCallback(
    (val: number) => {
      const newVol = Math.max(0, Math.min(1, val));
      setVolume(newVol);
      if (newVol > 0 && muted) setMuted(false);
    },
    [muted]
  );

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

    // Detect iOS (Safari / WebKit) — it has special fullscreen handling
    const isIOS =
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));

    // Helper: lock orientation to landscape
    const lockLandscape = () => {
      try {
        const so = (screen as any).orientation;
        if (so && typeof so.lock === "function") {
          so.lock("landscape").catch(() => {});
        }
      } catch {}
    };

    // Helper: unlock orientation
    const unlockOrientation = () => {
      try {
        const so = (screen as any).orientation;
        if (so && typeof so.unlock === "function") {
          so.unlock();
        }
      } catch {}
    };

    // ---- iOS: use webkitEnterFullscreen on the <video> element ----
    // This is the ONLY way to get true fullscreen (no URL bar, no browser
    // chrome) on iOS. The browser takes over the video element with its
    // own native fullscreen player. Must be called from a user gesture.
    if (isIOS && video) {
      const v = video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
        webkitExitFullscreen?: () => void;
        webkitDisplayingFullscreen?: boolean;
      };
      try {
        if (v.webkitDisplayingFullscreen) {
          v.webkitExitFullscreen?.();
        } else {
          v.webkitEnterFullscreen?.();
        }
      } catch {}
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
      try {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } catch {}
      unlockOrientation();
      setFsOverride(false);
      armHide();
      return;
    }

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
      } else if ((video as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
        fsWorked = true;
      }
    } catch {}

    if (fsWorked) {
      lockLandscape();
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
  // SPACE: play/pause, M: mute/unmute, F: fullscreen toggle
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
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [channel, togglePlay, toggleMute, toggleFullscreen]);

  // Touch event handlers on container (used as React fallback - mostly empty)
  const noop = () => {};

  const onVideoClick = (e: ReactMouseEvent) => {
    if (isSwiping.current) return;
    e.stopPropagation();
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
    background: "radial-gradient(circle at 50% 50%, #0a0612, #000 80%)",
    touchAction: presentationFullscreen ? "none" : "manipulation",
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={armHide}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onTouchStart={noop}
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
            autoPlay
            muted={muted}
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

      {/* Loading */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-white/80" />
            <span className="text-xs font-medium uppercase tracking-widest text-white/60">
              Loading
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-200">
            {error}
          </div>
        </div>
      )}

      {/* Gesture indicator - shown only during active swipe */}
      {gestureLevel.visible && gestureLevel.type && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/70 px-7 py-5 backdrop-blur-xl"
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
                <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 backdrop-blur-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
                    Live
                  </span>
                </div>
                <h2 className="truncate text-sm font-semibold text-white sm:text-lg">
                  {channel.name}
                </h2>
                <p className="mt-0.5 truncate text-[10px] text-white/60 sm:text-xs">
                  {channel.group}
                </p>
              </>
            )}
          </div>
          {presentationFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/80 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-95"
              aria-label="Exit fullscreen"
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
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Center play/pause on pause - always perfectly centered on first paint */}
      {!playing && !loading && channel && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <button
            onClick={togglePlay}
            className="pointer-events-auto flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-transform duration-300 hover:scale-110 hover:bg-white/20 active:scale-95 sm:h-20 sm:w-20"
            style={{ animation: "playPop 280ms cubic-bezier(.34,1.56,.64,1) both" }}
            aria-label="Play"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-1"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>
        </div>
      )}

      {/* Bottom controls */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 transition-all duration-500 sm:p-5",
          controlsVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        )}
      >
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          {/* Play/pause */}
          <button
            onClick={togglePlay}
            className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-white/30 hover:bg-white/15 active:scale-95 sm:h-11 sm:w-11"
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

          {/* Volume */}
          <div className="group/vol flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-white/30 hover:bg-white/15 active:scale-95 sm:h-11 sm:w-11"
              aria-label={muted ? "Unmute" : "Mute"}
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
            <div
              className="relative hidden h-1 w-0 overflow-hidden rounded-full transition-all duration-300 group-hover/vol:w-24 sm:block"
              style={{ backgroundColor: "#1f2120" }}
            >
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${(muted ? 0 : volume) * 100}%`,
                  backgroundColor: "#332a4f",
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
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md sm:flex">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                  Now Playing
                </span>
              </div>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-white/30 hover:bg-white/15 active:scale-95 sm:h-11 sm:w-11"
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

        {/* Live indicator strip */}
        <div className="mt-2.5 flex items-center gap-2 sm:mt-3">
          <div className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-red-300">
              Live Stream
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes playPop {
          0% { opacity: 0; transform: scale(0.7); }
          60% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes gesturePop {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
