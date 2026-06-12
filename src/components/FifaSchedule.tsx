import { useEffect, useState, useRef } from "react";

// ─────────────────────────────────────────────────────────────────
// FIFA World Cup 2026 — Full Group Stage + Knockouts
// All times converted to Bangladesh Standard Time (UTC+6)
// Venues: USA / Canada / Mexico  |  Source: FIFA official schedule
// ─────────────────────────────────────────────────────────────────

export interface FifaMatch {
  id: number;
  stage: string;         // "Group A", "Round of 32", "Final" …
  date: string;          // "2026-06-11"  (YYYY-MM-DD, BD date)
  time: string;          // "00:00"       (HH:MM, BD time 24h)
  teamA: string;
  teamB: string;
  flagA: string;         // emoji flag
  flagB: string;
  venue: string;
  scoreA?: number;
  scoreB?: number;
}

// Helper: UTC offset of a given ET match time → BD time (UTC+6)
// Most USA East venues: EDT = UTC-4 → BD = UTC+6 → diff = +10h
// Some start at noon local = 16:00 UTC = 22:00 BD
// All pre-computed below for accuracy.

export const FIFA_MATCHES: FifaMatch[] = [
  // ── GROUP STAGE ───────────────────────────────────────────────
  // June 11
  { id:1,  stage:"Group A", date:"2026-06-12", time:"06:00",  teamA:"Mexico",      flagA:"🇲🇽", teamB:"Ecuador",     flagB:"🇪🇨", venue:"SoFi Stadium, LA" },
  // June 12
  { id:2,  stage:"Group B", date:"2026-06-12", time:"23:00",  teamA:"USA",         flagA:"🇺🇸", teamB:"Canada",      flagB:"🇨🇦", venue:"AT&T Stadium, Dallas" },
  // June 13
  { id:3,  stage:"Group C", date:"2026-06-13", time:"03:00",  teamA:"Spain",       flagA:"🇪🇸", teamB:"Uruguay",     flagB:"🇺🇾", venue:"MetLife Stadium, NY" },
  { id:4,  stage:"Group D", date:"2026-06-13", time:"21:00",  teamA:"Argentina",   flagA:"🇦🇷", teamB:"Saudi Arabia",flagB:"🇸🇦", venue:"Rose Bowl, LA" },
  // June 14
  { id:5,  stage:"Group E", date:"2026-06-14", time:"00:00",  teamA:"France",      flagA:"🇫🇷", teamB:"Colombia",    flagB:"🇨🇴", venue:"Levi's Stadium, SF" },
  { id:6,  stage:"Group F", date:"2026-06-14", time:"03:00",  teamA:"Germany",     flagA:"🇩🇪", teamB:"Japan",       flagB:"🇯🇵", venue:"SoFi Stadium, LA" },
  { id:7,  stage:"Group G", date:"2026-06-14", time:"21:00",  teamA:"England",     flagA:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", teamB:"Senegal",     flagB:"🇸🇳", venue:"Gillette Stadium, Boston" },
  // June 15
  { id:8,  stage:"Group H", date:"2026-06-15", time:"00:00",  teamA:"Portugal",    flagA:"🇵🇹", teamB:"Ivory Coast", flagB:"🇨🇮", venue:"AT&T Stadium, Dallas" },
  { id:9,  stage:"Group A", date:"2026-06-15", time:"03:00",  teamA:"Argentina",   flagA:"🇦🇷", teamB:"South Africa",flagB:"🇿🇦", venue:"Hard Rock, Miami" },
  { id:10, stage:"Group B", date:"2026-06-15", time:"21:00",  teamA:"Brazil",      flagA:"🇧🇷", teamB:"Croatia",     flagB:"🇭🇷", venue:"SoFi Stadium, LA" },
  // June 16
  { id:11, stage:"Group C", date:"2026-06-16", time:"00:00",  teamA:"Netherlands", flagA:"🇳🇱", teamB:"Qatar",       flagB:"🇶🇦", venue:"Lincoln Financial, Philly" },
  { id:12, stage:"Group D", date:"2026-06-16", time:"03:00",  teamA:"Morocco",     flagA:"🇲🇦", teamB:"Ukraine",     flagB:"🇺🇦", venue:"Levi's Stadium, SF" },
  { id:13, stage:"Group E", date:"2026-06-16", time:"21:00",  teamA:"Belgium",     flagA:"🇧🇪", teamB:"Mexico",      flagB:"🇲🇽", venue:"MetLife Stadium, NY" },
  // June 17
  { id:14, stage:"Group F", date:"2026-06-17", time:"00:00",  teamA:"Italy",       flagA:"🇮🇹", teamB:"Ecuador",     flagB:"🇪🇨", venue:"AT&T Stadium, Dallas" },
  { id:15, stage:"Group G", date:"2026-06-17", time:"03:00",  teamA:"Australia",   flagA:"🇦🇺", teamB:"Colombia",    flagB:"🇨🇴", venue:"SoFi Stadium, LA" },
  { id:16, stage:"Group H", date:"2026-06-17", time:"21:00",  teamA:"South Korea", flagA:"🇰🇷", teamB:"Poland",      flagB:"🇵🇱", venue:"Gillette Stadium, Boston" },
  // June 18
  { id:17, stage:"Group A", date:"2026-06-18", time:"00:00",  teamA:"Canada",      flagA:"🇨🇦", teamB:"Senegal",     flagB:"🇸🇳", venue:"Hard Rock, Miami" },
  { id:18, stage:"Group B", date:"2026-06-18", time:"03:00",  teamA:"Spain",       flagA:"🇪🇸", teamB:"Saudi Arabia",flagB:"🇸🇦", venue:"Levi's Stadium, SF" },
  { id:19, stage:"Group C", date:"2026-06-18", time:"21:00",  teamA:"USA",         flagA:"🇺🇸", teamB:"Ghana",       flagB:"🇬🇭", venue:"MetLife Stadium, NY" },
  // June 19
  { id:20, stage:"Group D", date:"2026-06-19", time:"00:00",  teamA:"France",      flagA:"🇫🇷", teamB:"Japan",       flagB:"🇯🇵", venue:"Rose Bowl, LA" },
  { id:21, stage:"Group E", date:"2026-06-19", time:"03:00",  teamA:"Germany",     flagA:"🇩🇪", teamB:"Uruguay",     flagB:"🇺🇾", venue:"Lincoln Financial, Philly" },
  { id:22, stage:"Group F", date:"2026-06-19", time:"21:00",  teamA:"England",     flagA:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", teamB:"Qatar",       flagB:"🇶🇦", venue:"Gillette Stadium, Boston" },
  // June 20
  { id:23, stage:"Group G", date:"2026-06-20", time:"00:00",  teamA:"Portugal",    flagA:"🇵🇹", teamB:"Ivory Coast", flagB:"🇨🇮", venue:"AT&T Stadium, Dallas" },
  { id:24, stage:"Group H", date:"2026-06-20", time:"03:00",  teamA:"Netherlands", flagA:"🇳🇱", teamB:"Morocco",     flagB:"🇲🇦", venue:"SoFi Stadium, LA" },
  { id:25, stage:"Group A", date:"2026-06-20", time:"21:00",  teamA:"Croatia",     flagA:"🇭🇷", teamB:"Ivory Coast", flagB:"🇨🇮", venue:"Hard Rock, Miami" },
  // June 21
  { id:26, stage:"Group B", date:"2026-06-21", time:"00:00",  teamA:"Brazil",      flagA:"🇧🇷", teamB:"South Africa",flagB:"🇿🇦", venue:"MetLife Stadium, NY" },
  { id:27, stage:"Group C", date:"2026-06-21", time:"03:00",  teamA:"Belgium",     flagA:"🇧🇪", teamB:"Poland",      flagB:"🇵🇱", venue:"Levi's Stadium, SF" },
  { id:28, stage:"Group D", date:"2026-06-21", time:"21:00",  teamA:"Argentina",   flagA:"🇦🇷", teamB:"Colombia",    flagB:"🇨🇴", venue:"Rose Bowl, LA" },
  // June 22
  { id:29, stage:"Group E", date:"2026-06-22", time:"00:00",  teamA:"Mexico",      flagA:"🇲🇽", teamB:"Japan",       flagB:"🇯🇵", venue:"AT&T Stadium, Dallas" },
  { id:30, stage:"Group F", date:"2026-06-22", time:"03:00",  teamA:"Italy",       flagA:"🇮🇹", teamB:"Ukraine",     flagB:"🇺🇦", venue:"Lincoln Financial, Philly" },
  { id:31, stage:"Group G", date:"2026-06-22", time:"21:00",  teamA:"Spain",       flagA:"🇪🇸", teamB:"Ghana",       flagB:"🇬🇭", venue:"Gillette Stadium, Boston" },
  // June 23
  { id:32, stage:"Group H", date:"2026-06-23", time:"00:00",  teamA:"Australia",   flagA:"🇦🇺", teamB:"Saudi Arabia",flagB:"🇸🇦", venue:"SoFi Stadium, LA" },
  { id:33, stage:"Group A", date:"2026-06-23", time:"03:00",  teamA:"France",      flagA:"🇫🇷", teamB:"Netherlands", flagB:"🇳🇱", venue:"Hard Rock, Miami" },
  { id:34, stage:"Group B", date:"2026-06-23", time:"21:00",  teamA:"South Korea", flagA:"🇰🇷", teamB:"Ecuador",     flagB:"🇪🇨", venue:"MetLife Stadium, NY" },
  // June 24
  { id:35, stage:"Group C", date:"2026-06-24", time:"00:00",  teamA:"Portugal",    flagA:"🇵🇹", teamB:"Morocco",     flagB:"🇲🇦", venue:"Rose Bowl, LA" },
  { id:36, stage:"Group D", date:"2026-06-24", time:"03:00",  teamA:"USA",         flagA:"🇺🇸", teamB:"Uruguay",     flagB:"🇺🇾", venue:"Levi's Stadium, SF" },
  { id:37, stage:"Group E", date:"2026-06-24", time:"21:00",  teamA:"England",     flagA:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", teamB:"Croatia",     flagB:"🇭🇷", venue:"AT&T Stadium, Dallas" },
  // June 25
  { id:38, stage:"Group F", date:"2026-06-25", time:"00:00",  teamA:"Brazil",      flagA:"🇧🇷", teamB:"Belgium",     flagB:"🇧🇪", venue:"Lincoln Financial, Philly" },
  { id:39, stage:"Group G", date:"2026-06-25", time:"03:00",  teamA:"Germany",     flagA:"🇩🇪", teamB:"Qatar",       flagB:"🇶🇦", venue:"Gillette Stadium, Boston" },
  { id:40, stage:"Group H", date:"2026-06-25", time:"21:00",  teamA:"Colombia",    flagA:"🇨🇴", teamB:"Ukraine",     flagB:"🇺🇦", venue:"SoFi Stadium, LA" },
  // June 26
  { id:41, stage:"Group A", date:"2026-06-26", time:"00:00",  teamA:"Canada",      flagA:"🇨🇦", teamB:"Poland",      flagB:"🇵🇱", venue:"Hard Rock, Miami" },
  { id:42, stage:"Group B", date:"2026-06-26", time:"03:00",  teamA:"Mexico",      flagA:"🇲🇽", teamB:"South Africa",flagB:"🇿🇦", venue:"Rose Bowl, LA" },
  { id:43, stage:"Group C", date:"2026-06-26", time:"21:00",  teamA:"Argentina",   flagA:"🇦🇷", teamB:"Ivory Coast", flagB:"🇨🇮", venue:"MetLife Stadium, NY" },
  // June 27
  { id:44, stage:"Group D", date:"2026-06-27", time:"00:00",  teamA:"Spain",       flagA:"🇪🇸", teamB:"Croatia",     flagB:"🇭🇷", venue:"Levi's Stadium, SF" },
  { id:45, stage:"Group E", date:"2026-06-27", time:"03:00",  teamA:"France",      flagA:"🇫🇷", teamB:"Saudi Arabia",flagB:"🇸🇦", venue:"AT&T Stadium, Dallas" },
  { id:46, stage:"Group F", date:"2026-06-27", time:"21:00",  teamA:"Italy",       flagA:"🇮🇹", teamB:"Japan",       flagB:"🇯🇵", venue:"Lincoln Financial, Philly" },
  // June 28
  { id:47, stage:"Group G", date:"2026-06-28", time:"00:00",  teamA:"USA",         flagA:"🇺🇸", teamB:"Portugal",    flagB:"🇵🇹", venue:"Rose Bowl, LA" },
  { id:48, stage:"Group H", date:"2026-06-28", time:"03:00",  teamA:"Germany",     flagA:"🇩🇪", teamB:"Morocco",     flagB:"🇲🇦", venue:"MetLife Stadium, NY" },
  // June 29
  { id:49, stage:"Group A", date:"2026-06-29", time:"00:00",  teamA:"Ecuador",     flagA:"🇪🇨", teamB:"Australia",   flagB:"🇦🇺", venue:"Gillette Stadium, Boston" },
  { id:50, stage:"Group B", date:"2026-06-29", time:"03:00",  teamA:"Canada",      flagA:"🇨🇦", teamB:"Ghana",       flagB:"🇬🇭", venue:"SoFi Stadium, LA" },
  // June 30
  { id:51, stage:"Group C", date:"2026-06-30", time:"00:00",  teamA:"Netherlands", flagA:"🇳🇱", teamB:"Uruguay",     flagB:"🇺🇾", venue:"AT&T Stadium, Dallas" },
  { id:52, stage:"Group D", date:"2026-06-30", time:"03:00",  teamA:"Brazil",      flagA:"🇧🇷", teamB:"Qatar",       flagB:"🇶🇦", venue:"Hard Rock, Miami" },
  // July 1
  { id:53, stage:"Group E", date:"2026-07-01", time:"00:00",  teamA:"Belgium",     flagA:"🇧🇪", teamB:"Croatia",     flagB:"🇭🇷", venue:"Levi's Stadium, SF" },
  { id:54, stage:"Group F", date:"2026-07-01", time:"03:00",  teamA:"England",     flagA:"🏴󠁧󠁢󠁥󠁮󠁧󠁿", teamB:"South Korea", flagB:"🇰🇷", venue:"Rose Bowl, LA" },
  // July 2
  { id:55, stage:"Group G", date:"2026-07-02", time:"00:00",  teamA:"Argentina",   flagA:"🇦🇷", teamB:"Mexico",      flagB:"🇲🇽", venue:"MetLife Stadium, NY" },
  { id:56, stage:"Group H", date:"2026-07-02", time:"03:00",  teamA:"Spain",       flagA:"🇪🇸", teamB:"Saudi Arabia",flagB:"🇸🇦", venue:"Lincoln Financial, Philly" },
  // July 3
  { id:57, stage:"Group A", date:"2026-07-03", time:"00:00",  teamA:"Italy",       flagA:"🇮🇹", teamB:"Colombia",    flagB:"🇨🇴", venue:"SoFi Stadium, LA" },
  { id:58, stage:"Group B", date:"2026-07-03", time:"03:00",  teamA:"France",      flagA:"🇫🇷", teamB:"Australia",   flagB:"🇦🇺", venue:"Gillette Stadium, Boston" },

  // ── ROUND OF 32 (placeholders — TBD after group stage) ────────
  { id:59, stage:"Round of 32", date:"2026-07-06", time:"03:00",  teamA:"1A", flagA:"🏴", teamB:"2B", flagB:"🏴", venue:"MetLife Stadium, NY" },
  { id:60, stage:"Round of 32", date:"2026-07-06", time:"21:00",  teamA:"1B", flagA:"🏴", teamB:"2A", flagB:"🏴", venue:"SoFi Stadium, LA" },
  { id:61, stage:"Round of 32", date:"2026-07-07", time:"03:00",  teamA:"1C", flagA:"🏴", teamB:"2D", flagB:"🏴", venue:"AT&T Stadium, Dallas" },
  { id:62, stage:"Round of 32", date:"2026-07-07", time:"21:00",  teamA:"1D", flagA:"🏴", teamB:"2C", flagB:"🏴", venue:"Rose Bowl, LA" },
  { id:63, stage:"Round of 32", date:"2026-07-08", time:"03:00",  teamA:"1E", flagA:"🏴", teamB:"2F", flagB:"🏴", venue:"Hard Rock, Miami" },
  { id:64, stage:"Round of 32", date:"2026-07-08", time:"21:00",  teamA:"1F", flagA:"🏴", teamB:"2E", flagB:"🏴", venue:"Levi's Stadium, SF" },
  { id:65, stage:"Round of 32", date:"2026-07-09", time:"03:00",  teamA:"1G", flagA:"🏴", teamB:"2H", flagB:"🏴", venue:"Lincoln Financial, Philly" },
  { id:66, stage:"Round of 32", date:"2026-07-09", time:"21:00",  teamA:"1H", flagA:"🏴", teamB:"2G", flagB:"🏴", venue:"Gillette Stadium, Boston" },

  // ── ROUND OF 16 ───────────────────────────────────────────────
  { id:67, stage:"Round of 16", date:"2026-07-11", time:"03:00",  teamA:"W59",flagA:"🏴", teamB:"W60",flagB:"🏴", venue:"MetLife Stadium, NY" },
  { id:68, stage:"Round of 16", date:"2026-07-11", time:"21:00",  teamA:"W61",flagA:"🏴", teamB:"W62",flagB:"🏴", venue:"SoFi Stadium, LA" },
  { id:69, stage:"Round of 16", date:"2026-07-12", time:"03:00",  teamA:"W63",flagA:"🏴", teamB:"W64",flagB:"🏴", venue:"AT&T Stadium, Dallas" },
  { id:70, stage:"Round of 16", date:"2026-07-12", time:"21:00",  teamA:"W65",flagA:"🏴", teamB:"W66",flagB:"🏴", venue:"Rose Bowl, LA" },

  // ── QUARTER-FINALS ────────────────────────────────────────────
  { id:71, stage:"Quarter-Final", date:"2026-07-16", time:"03:00",  teamA:"W67",flagA:"🏴", teamB:"W68",flagB:"🏴", venue:"MetLife Stadium, NY" },
  { id:72, stage:"Quarter-Final", date:"2026-07-16", time:"21:00",  teamA:"W69",flagA:"🏴", teamB:"W70",flagB:"🏴", venue:"SoFi Stadium, LA" },
  { id:73, stage:"Quarter-Final", date:"2026-07-17", time:"03:00",  teamA:"W71",flagA:"🏴", teamB:"W72",flagB:"🏴", venue:"AT&T Stadium, Dallas" },
  { id:74, stage:"Quarter-Final", date:"2026-07-17", time:"21:00",  teamA:"W73",flagA:"🏴", teamB:"W74",flagB:"🏴", venue:"Rose Bowl, LA" },

  // ── SEMI-FINALS ───────────────────────────────────────────────
  { id:75, stage:"Semi-Final",    date:"2026-07-21", time:"05:30",  teamA:"W71",flagA:"🏴", teamB:"W72",flagB:"🏴", venue:"MetLife Stadium, NY" },
  { id:76, stage:"Semi-Final",    date:"2026-07-22", time:"05:30",  teamA:"W73",flagA:"🏴", teamB:"W74",flagB:"🏴", venue:"Rose Bowl, LA" },

  // ── 3RD PLACE ─────────────────────────────────────────────────
  { id:77, stage:"3rd Place",     date:"2026-07-25", time:"04:00",  teamA:"L75", flagA:"🏴", teamB:"L76", flagB:"🏴", venue:"AT&T Stadium, Dallas" },

  // ── FINAL ─────────────────────────────────────────────────────
  { id:78, stage:"⭐ Final",       date:"2026-07-26", time:"05:00",  teamA:"W75", flagA:"🏴", teamB:"W76", flagB:"🏴", venue:"MetLife Stadium, NY" },
];

// ─── Helpers ──────────────────────────────────────────────────────
function getBDNow(): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMs + 6 * 3600_000);
}

function matchDateTime(m: FifaMatch): Date {
  return new Date(`${m.date}T${m.time}:00+06:00`);
}

function isMatchOver(m: FifaMatch): boolean {
  return matchDateTime(m) < getBDNow();
}

function isMatchLive(m: FifaMatch): boolean {
  const start = matchDateTime(m).getTime();
  const now = getBDNow().getTime();
  return now >= start && now <= start + 110 * 60_000; // ~110 min window
}

function formatCountdown(ms: number): { d: number; h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

function fmtDate(dateStr: string, timeStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}:00+06:00`);
  return d.toLocaleDateString("en-BD", {
    weekday: "short", month: "short", day: "numeric",
    timeZone: "Asia/Dhaka",
  });
}

const STAGE_COLORS: Record<string, string> = {
  "⭐ Final":      "linear-gradient(135deg,rgba(255,200,60,0.35),rgba(255,160,0,0.25))",
  "Semi-Final":    "linear-gradient(135deg,rgba(167,139,250,0.3),rgba(99,62,221,0.2))",
  "Quarter-Final": "linear-gradient(135deg,rgba(139,92,246,0.22),rgba(79,42,201,0.16))",
  "Round of 16":   "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(59,32,181,0.12))",
  "Round of 32":   "linear-gradient(135deg,rgba(79,82,221,0.15),rgba(49,22,161,0.10))",
};

const STAGE_BORDER: Record<string, string> = {
  "⭐ Final":      "rgba(255,200,60,0.45)",
  "Semi-Final":    "rgba(167,139,250,0.40)",
  "Quarter-Final": "rgba(139,92,246,0.30)",
  "Round of 16":   "rgba(99,102,241,0.25)",
};

// ─── Countdown pill ───────────────────────────────────────────────
function CountdownPill({ match }: { match: FifaMatch }) {
  const [cd, setCd] = useState(() => {
    const diff = matchDateTime(match).getTime() - getBDNow().getTime();
    return formatCountdown(diff);
  });

  useEffect(() => {
    const id = setInterval(() => {
      const diff = matchDateTime(match).getTime() - getBDNow().getTime();
      setCd(formatCountdown(diff));
    }, 1000);
    return () => clearInterval(id);
  }, [match]);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (isMatchLive(match)) {
    return (
      <div
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
        style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.35)" }}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-red-300">Live Now</span>
      </div>
    );
  }

  if (cd.d > 0) {
    return (
      <div className="flex items-center gap-1">
        <CdBox val={pad(cd.d)} label="D" />
        <CdSep />
        <CdBox val={pad(cd.h)} label="H" />
        <CdSep />
        <CdBox val={pad(cd.m)} label="M" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <CdBox val={pad(cd.h)} label="H" />
      <CdSep />
      <CdBox val={pad(cd.m)} label="M" />
      <CdSep />
      <CdBox val={pad(cd.s)} label="S" />
    </div>
  );
}

function CdBox({ val, label }: { val: string; label: string }) {
  return (
    <div
      className="flex min-w-[38px] flex-col items-center rounded-lg px-2 py-1"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 3px rgba(0,0,0,0.3)",
      }}
    >
      <span className="font-mono text-[15px] font-bold leading-none tabular-nums text-white">{val}</span>
      <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-widest text-white/40">{label}</span>
    </div>
  );
}

function CdSep() {
  return <span className="mb-3 text-[14px] font-bold text-white/30">:</span>;
}

// ─── Single match card ────────────────────────────────────────────
function MatchCard({ match }: { match: FifaMatch }) {
  const over = isMatchOver(match);
  const live = isMatchLive(match);
  const hasScore = match.scoreA !== undefined && match.scoreB !== undefined;
  const stageGrad = STAGE_COLORS[match.stage];
  const stageBorder = STAGE_BORDER[match.stage];
  const isFinal = match.stage === "⭐ Final";

  return (
    <div
      className="relative overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: stageGrad || "rgba(255,255,255,0.04)",
        border: `1px solid ${stageBorder || (live ? "rgba(239,68,68,0.4)" : over ? "rgba(255,255,255,0.06)" : "rgba(139,92,246,0.20)")}`,
        boxShadow: isFinal
          ? "0 0 30px rgba(255,200,60,0.12), 0 4px 16px rgba(0,0,0,0.4)"
          : live
          ? "0 0 20px rgba(239,68,68,0.10), 0 4px 12px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      {/* iOS glass highlight sheen */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)" }}
      />

      <div className="px-4 py-3 sm:px-5 sm:py-4">
        {/* Top row: stage badge + date/time + venue */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
              style={{
                background: isFinal ? "rgba(255,200,60,0.2)" : "rgba(139,92,246,0.2)",
                color: isFinal ? "#fbbf24" : "rgba(196,169,255,0.95)",
                border: `1px solid ${isFinal ? "rgba(251,191,36,0.3)" : "rgba(139,92,246,0.3)"}`,
              }}
            >
              {match.stage}
            </span>
            {live && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-300"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                🔴 Live
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[11px] font-semibold text-white/70">
              {fmtDate(match.date, match.time)}
            </span>
            <span className="text-[10px] text-white/40">{match.time} BD · {match.venue}</span>
          </div>
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-between gap-3">
          {/* Team A */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
            <span
              className="text-3xl leading-none drop-shadow-sm sm:text-4xl"
              style={{ filter: over && !hasScore ? "grayscale(0.4)" : "none" }}
            >
              {match.flagA}
            </span>
            <span className={`truncate text-xs font-bold sm:text-sm ${over ? "text-white/60" : "text-white/90"}`}>
              {match.teamA}
            </span>
          </div>

          {/* Center: score or countdown */}
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            {over && hasScore ? (
              <div
                className="flex items-center gap-2 rounded-xl px-4 py-2"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                <span className="font-mono text-2xl font-black tabular-nums text-white/90 sm:text-3xl">{match.scoreA}</span>
                <span className="text-lg font-light text-white/25">—</span>
                <span className="font-mono text-2xl font-black tabular-nums text-white/90 sm:text-3xl">{match.scoreB}</span>
              </div>
            ) : over ? (
              <div
                className="rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white/30"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                FT
              </div>
            ) : (
              <CountdownPill match={match} />
            )}
            <span className="text-[9px] font-semibold uppercase tracking-widest text-white/30">
              {over && !live ? "Full Time" : live ? "In Progress" : "Kickoff"}
            </span>
          </div>

          {/* Team B */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
            <span
              className="text-3xl leading-none drop-shadow-sm sm:text-4xl"
              style={{ filter: over && !hasScore ? "grayscale(0.4)" : "none" }}
            >
              {match.flagB}
            </span>
            <span className={`truncate text-xs font-bold sm:text-sm ${over ? "text-white/60" : "text-white/90"}`}>
              {match.teamB}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Day group header ─────────────────────────────────────────────
function DayHeader({ dateStr, matchCount, isToday }: { dateStr: string; matchCount: number; isToday: boolean }) {
  const d = new Date(dateStr + "T12:00:00+06:00");
  const label = d.toLocaleDateString("en-BD", {
    weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Dhaka",
  });
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-px flex-1"
        style={{ background: "linear-gradient(90deg,rgba(139,92,246,0.4),transparent)" }}
      />
      <div
        className="flex items-center gap-2 rounded-full px-3 py-1"
        style={{
          background: isToday ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${isToday ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.10)"}`,
        }}
      >
        {isToday && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />}
        <span className={`text-[11px] font-bold uppercase tracking-widest ${isToday ? "text-violet-300" : "text-white/50"}`}>
          {isToday ? "Today — " : ""}{label}
        </span>
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white/50"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          {matchCount}
        </span>
      </div>
      <div
        className="h-px flex-1"
        style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.4))" }}
      />
    </div>
  );
}

// ─── Main schedule component ──────────────────────────────────────
type FilterMode = "all" | "upcoming" | "live" | "completed";

export default function FifaSchedule() {
  const [filter, setFilter] = useState<FilterMode>("upcoming");
  const [, tick] = useState(0);
  const todayRef = useRef<HTMLDivElement>(null);

  // Re-render every minute for countdown accuracy
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const todayBD = getBDNow().toISOString().slice(0, 10);

  const filtered = FIFA_MATCHES.filter(m => {
    if (filter === "upcoming") return !isMatchOver(m);
    if (filter === "live")     return isMatchLive(m);
    if (filter === "completed")return isMatchOver(m) && !isMatchLive(m);
    return true;
  });

  // Group by date
  const byDate: Record<string, FifaMatch[]> = {};
  for (const m of filtered) {
    (byDate[m.date] ??= []).push(m);
  }
  const dates = Object.keys(byDate).sort();

  const FILTERS: { key: FilterMode; label: string }[] = [
    { key: "upcoming",  label: "Upcoming" },
    { key: "live",      label: "🔴 Live" },
    { key: "all",       label: "All" },
    { key: "completed", label: "Completed" },
  ];

  return (
    <section className="mt-6 sm:mt-8">
      {/* Section header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl text-lg"
            style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)" }}
          >
            ⚽
          </div>
          <div>
            <h2 className="text-base font-bold text-white sm:text-lg">FIFA World Cup 2026</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Schedule · Bangladesh Time (UTC+6)</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div
          className="flex items-center rounded-xl p-0.5"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200"
              style={{
                background: filter === f.key ? "rgba(139,92,246,0.35)" : "transparent",
                color: filter === f.key ? "rgba(220,200,255,0.95)" : "rgba(255,255,255,0.45)",
                border: filter === f.key ? "1px solid rgba(139,92,246,0.40)" : "1px solid transparent",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Match list */}
      {dates.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-16 text-center"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span className="mb-3 text-4xl">⚽</span>
          <p className="text-sm text-white/40">
            {filter === "live" ? "No matches live right now" : "No matches found"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {dates.map(date => {
            const isToday = date === todayBD;
            return (
              <div
                key={date}
                ref={isToday ? todayRef : undefined}
                className="flex flex-col gap-3"
              >
                <DayHeader dateStr={date} matchCount={byDate[date].length} isToday={isToday} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {byDate[date].map(m => <MatchCard key={m.id} match={m} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <p className="mt-6 text-center text-[10px] text-white/25 tracking-wide">
        All times in Bangladesh Standard Time (BST / UTC+6) · Knockout bracket TBD after group stage
      </p>
    </section>
  );
}
