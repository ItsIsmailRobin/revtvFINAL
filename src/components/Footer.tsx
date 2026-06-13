import { useEffect, useState } from "react";

function formatBDTime() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const bd = new Date(utcMs + 6 * 60 * 60_000);
  const h24 = bd.getHours();
  const mm = String(bd.getMinutes()).padStart(2, "0");
  const ss = String(bd.getSeconds()).padStart(2, "0");
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  const hh = String(h12).padStart(2, "0");
  return { time: `${hh}:${mm}:${ss}`, ampm };
}

export default function Footer() {
  const [{ time, ampm }, setState] = useState(formatBDTime);

  useEffect(() => {
    const id = window.setInterval(() => setState(formatBDTime()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <footer className="footer-root flex flex-col items-start gap-1.5 px-1 pb-4 pt-3 sm:gap-2">
      {/* Clock pill — hover → bigger + white glow */}
      <div
        className="footer-clock group inline-flex cursor-default items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.07] hover:shadow-[0_0_18px_rgba(255,255,255,0.22)] hover:scale-105"
        aria-label={`Time ${time} ${ampm}`}
      >
        <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-white/85" style={{ animation: "dotPulse 1.4s ease-in-out infinite" }} />
          <span className="absolute inset-[3px] rounded-full bg-white/95" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/55 transition-colors duration-300 group-hover:text-white/80">
          TIME
        </span>
        <span className="h-2.5 w-px bg-white/15" />
        <span className="font-mono text-[13px] font-medium tabular-nums text-white/80 transition-colors duration-300 group-hover:text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
          {time}
        </span>
        <span className="text-[11px] font-semibold uppercase text-white/55 transition-colors duration-300 group-hover:text-white/80">
          {ampm}
        </span>
      </div>

      {/* Credits row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="group flex cursor-default items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/30 transition-colors duration-300 hover:text-white/70">
          <span>Created By</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>Revenger</span>
        </div>
        <span className="text-white/15">·</span>
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/25">
          <span>Powered By</span>
          <a href="https://discord.gg/EttmFjhhq5" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-white/35 transition-colors hover:text-white/70">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"/></svg>
            <span>NoSCOPE ESPORTS</span>
          </a>
        </p>
      </div>

      <style>{`
        @keyframes dotPulse {
          0%, 100% { opacity: 0.45; transform: scale(0.85); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </footer>
  );
}
