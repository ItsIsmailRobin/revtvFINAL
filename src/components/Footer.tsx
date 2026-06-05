import { useEffect, useState } from "react";

function formatBDTime() {
  const now = new Date();
  // Bangladesh Standard Time = UTC+6
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  const bd = new Date(utcMs + 6 * 60 * 60_000);
  const h24 = bd.getHours();
  const mm = String(bd.getMinutes()).padStart(2, "0");
  const ss = String(bd.getSeconds()).padStart(2, "0");
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1; // 1..12
  const hh = String(h12).padStart(2, "0");
  return { time: `${hh}:${mm}:${ss}`, ampm };
}

export default function Footer() {
  const [{ time, ampm }, setState] = useState(formatBDTime);

  useEffect(() => {
    const id = window.setInterval(() => {
      setState(formatBDTime());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <footer className="flex flex-col items-center gap-1.5 px-2 pb-12 pt-10 text-center sm:gap-2 sm:px-0">
      {/* Animated clock dot + TIME | HH:MM:SS AM/PM - smaller */}
      <div
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 backdrop-blur-md"
        aria-label={`Time ${time} ${ampm}`}
      >
        {/* Animated clock dot - rotating ring + pulsing core */}
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full border border-white/30"
            style={{ animation: "dotSpin 6s linear infinite" }}
          />
          <span
            className="absolute inset-[2.5px] rounded-full bg-white/70"
            style={{ animation: "dotPulse 1.4s ease-in-out infinite" }}
          />
          <span className="absolute inset-[4px] rounded-full bg-white/95" />
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/55 sm:text-[10px]">
          TIME
        </span>
        <span className="h-2 w-px bg-white/15" />
        <span
          className="font-mono text-[11px] font-medium tabular-nums tracking-[0.06em] text-white/80 sm:text-xs"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {time}
        </span>
        <span
          className="ml-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/55 sm:text-[10px]"
          aria-hidden
        >
          {ampm}
        </span>
      </div>

      {/* Line 1: Created By [zap icon] Revenger - hover the icon and text together */}
      <div className="group flex cursor-default items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/35 transition-colors duration-300 hover:text-white sm:text-xs">
        <span>Created By</span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-zap"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span>Revenger</span>
      </div>

      {/* Line 2: Powered By Team [Discord SVG] NoSCOPE ESPORTS (link) */}
      <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[10px] uppercase tracking-[0.2em] text-white/30 sm:text-xs">
        <span className="text-white/20">Powered By Team</span>
        <a
          href="https://discord.gg/EttmFjhhq5"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-1.5 text-white/40 transition-colors duration-300 hover:text-white/80"
          aria-label="NoSCOPE ESPORTS on Discord"
        >
          {/* Discord SVG icon */}
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className="transition-transform duration-300 group-hover:scale-110"
          >
            <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z" />
          </svg>
          <span className="tracking-[0.18em]">NoSCOPE ESPORTS</span>
        </a>
      </p>

      <style>{`
        @keyframes dotSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.45; transform: scale(0.85); }
          50%      { opacity: 1;    transform: scale(1.1); }
        }
      `}</style>
    </footer>
  );
}
