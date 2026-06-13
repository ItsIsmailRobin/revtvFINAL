import { useEffect, useRef, useState } from "react";

export default function Header() {
  const handleLogoClick = () => {
    window.location.href = window.location.origin + window.location.pathname;
  };

  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLivePlaylistClick = () => {
    if (refreshState === "loading") return; // prevent double-tap
    setRefreshState("loading");
    window.dispatchEvent(new CustomEvent("revtv:refresh-playlist"));
  };

  useEffect(() => {
    const onDone = () => {
      setRefreshState("done");
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setRefreshState("idle"), 2000);
    };
    const onError = () => {
      setRefreshState("error");
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setRefreshState("idle"), 2500);
    };
    window.addEventListener("revtv:refresh-done", onDone);
    window.addEventListener("revtv:refresh-error", onError);
    return () => {
      window.removeEventListener("revtv:refresh-done", onDone);
      window.removeEventListener("revtv:refresh-error", onError);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  // ── Inline BD clock ──────────────────────────────────────────────
  const [bdClock, setBdClock] = useState(() => {
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
    const bd = new Date(utcMs + 6 * 3600_000);
    const h24 = bd.getHours();
    const mm = String(bd.getMinutes()).padStart(2, "0");
    const ss = String(bd.getSeconds()).padStart(2, "0");
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = ((h24 + 11) % 12) + 1;
    return { time: `${String(h12).padStart(2, "0")}:${mm}:${ss}`, ampm };
  });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
      const bd = new Date(utcMs + 6 * 3600_000);
      const h24 = bd.getHours();
      const mm = String(bd.getMinutes()).padStart(2, "0");
      const ss = String(bd.getSeconds()).padStart(2, "0");
      const ampm = h24 >= 12 ? "PM" : "AM";
      const h12 = ((h24 + 11) % 12) + 1;
      setBdClock({ time: `${String(h12).padStart(2, "0")}:${mm}:${ss}`, ampm });
    };
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <header className="relative z-20 flex items-center justify-between border-b border-white/5 bg-black/50 px-4 py-3 sm:px-8 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={handleLogoClick} aria-label="RevTV - Go to homepage"
          className="group block transition-all duration-300 hover:scale-105 active:scale-95">
          <img src="https://i.postimg.cc/RZGz0gz9/Logo.png" alt="RevTV"
            className="block h-10 w-auto object-contain transition-all duration-500 group-hover:brightness-110 sm:h-12"
            style={{ maxWidth:"200px" }} loading="eager"
            onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
        </button>

        {/* Inline BD clock — no border, dot + HH:MM:SS AM/PM */}
        <div className="flex items-center gap-1.5 pl-1">
          <span className="relative inline-flex h-2 w-2 items-center justify-center shrink-0" style={{ marginLeft: "-3px" }}>
            <span
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 0 4px rgba(255,255,255,0.9)",
                animation: "headerClockDotPulse 1.4s ease-in-out infinite",
              }}
            />
          </span>
          <span
            className="flex items-baseline gap-1 font-semibold tabular-nums"
            style={{ fontSize: "15px", color: "#ffffff", fontFamily: "'Space Grotesk','Space Grotesk Fallback',sans-serif", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
          >
            <span>{bdClock.time}</span>
            <span className="uppercase tracking-widest" style={{ fontSize: "15px", color: "rgba(255,255,255,0.6)", lineHeight: 1 }}>
              {bdClock.ampm}
            </span>
          </span>
        </div>
      </div>

      {/* Update Playlist pill — no border/outline, purple dot + text */}
      <button onClick={handleLivePlaylistClick} aria-label="Update Playlist — click to refresh"
        disabled={refreshState === "loading"}
        className="group flex cursor-pointer items-center gap-2 px-3.5 py-2 transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-default disabled:opacity-80"
        style={{
          background: "transparent",
          border: "none",
          boxShadow: "none",
          borderRadius: "8px",
        }}>
        {/* Dot / spinner / tick */}
        <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
          {refreshState === "loading" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              style={{ animation: "spinOnce 0.8s linear infinite", color: "#6614c4" }}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          ) : refreshState === "done" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : refreshState === "error" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ backgroundColor: "#6614c4" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full"
                style={{ backgroundColor: "#6614c4", boxShadow: "0 0 6px rgba(102,20,196,0.9), 0 0 12px rgba(102,20,196,0.5)" }} />
            </>
          )}
        </span>
        {/* Text — hidden on phone, only the dot/icon remains */}
        <span className="hidden text-[11px] font-bold uppercase tracking-widest sm:inline"
          style={{
            color: refreshState === "done" ? "#22c55e" : refreshState === "error" ? "#ef4444" : "#6614c4",
            animation: refreshState === "idle" ? "updatePulse 2.4s ease-in-out infinite" : "none",
          }}>
          {refreshState === "loading" ? "Updating…" : refreshState === "done" ? "Updated!" : refreshState === "error" ? "Failed" : "Update Playlist"}
        </span>
      </button>

      <style>{`
        @keyframes updatePulse {
          0%,100% { opacity:.75; }
          50%      { opacity:1; text-shadow:0 0 14px rgba(102,20,196,0.85),0 0 22px rgba(102,20,196,0.4); }
        }
        @keyframes spinOnce {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes headerClockDotPulse {
          0%, 100% { opacity: 0.5; transform: scale(0.75); }
          50%      { opacity: 1;   transform: scale(1.35); }
        }
      `}</style>
    </header>
  );
}
