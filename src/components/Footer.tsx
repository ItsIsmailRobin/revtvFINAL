import { useState } from "react";

export default function Footer() {
  return null;
}

export function FooterCredits() {
  const [zapHover, setZapHover] = useState(false);
  const [discHover, setDiscHover] = useState(false);

  const TEXT: React.CSSProperties = { fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 500, transition: "color 0.3s, text-shadow 0.3s" };

  return (
    <div className="flex flex-col items-center gap-1" style={{ paddingTop: "24px", paddingBottom: "24px" }}>

      {/* Line 1: Created By [⚡ Revenger] */}
      <div
        className="group/line1 flex cursor-default items-center gap-1.5"
        style={{ color: "rgba(255,255,255,0.28)" }}
      >
        {/* "Created By" — whole-line white fade */}
        <span style={TEXT} className="group-hover/line1:text-white">
          Created By
        </span>

        {/* [⚡ Revenger] — white glow on this pair only */}
        <span
          className="flex items-center gap-1"
          onMouseEnter={() => setZapHover(true)}
          onMouseLeave={() => setZapHover(false)}
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{
              stroke: zapHover ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.45)",
              filter: zapHover ? "drop-shadow(0 0 3px rgba(255,255,255,0.5))" : "none",
              transform: zapHover ? "scale(1.15)" : "scale(1)",
              transition: "filter 0.3s, transform 0.3s, stroke 0.3s",
            }}
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span style={{
            ...TEXT,
            fontWeight: 700,
            color: zapHover ? "rgba(255,255,255,1)" : "inherit",
            textShadow: zapHover ? "0 0 4px rgba(255,255,255,0.45)" : "none",
          }}>
            Revenger
          </span>
        </span>
      </div>

      {/* Line 2: Powered By [Discord NoScope eSports] */}
      <div
        className="group/line2 flex items-center gap-1.5"
        style={{ color: "rgba(255,255,255,0.22)" }}
      >
        {/* "Powered By" — whole-line white fade */}
        <span style={TEXT} className="group-hover/line2:text-white">
          Powered By
        </span>

        {/* [Discord NoScope eSports] — white glow on this pair only */}
        <a
          href="https://discord.gg/EttmFjhhq5"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1"
          onMouseEnter={() => setDiscHover(true)}
          onMouseLeave={() => setDiscHover(false)}
        >
          <svg
            width="13" height="13" viewBox="0 0 24 24"
            fill="currentColor"
            style={{
              color: discHover ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.45)",
              filter: discHover ? "drop-shadow(0 0 3px rgba(255,255,255,0.45))" : "none",
              transition: "filter 0.3s, color 0.3s",
            }}
          >
            <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.26c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z" />
          </svg>
          <span style={{
            ...TEXT,
            color: discHover ? "rgba(255,255,255,1)" : "inherit",
            textShadow: discHover ? "0 0 4px rgba(255,255,255,0.45)" : "none",
          }}>
            NoScope eSports
          </span>
        </a>
      </div>

    </div>
  );
}
