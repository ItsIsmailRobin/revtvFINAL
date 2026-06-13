import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────
interface Match {
  id: number;
  stage: string;
  date: string;      // YYYY-MM-DD (BD date)
  time: string;      // HH:MM  24h BD
  teamA: string;
  teamB: string;
  flagA: string;     // PNG flag URL
  flagB: string;
  venue: string;
  city: string;
  scoreA?: number;
  scoreB?: number;
}

// ─── Flag helper — flagcdn.com PNG by ISO code ────────────────────
const f = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

// ─── Full FIFA 2026 schedule (BD time = UTC+6) ───────────────────
// Group stage: June 11 – July 3 · Knockouts: July 6 – July 26
const MATCHES: Match[] = [
  // GROUP STAGE — 48 matches across 8 groups (A–H), 6 matches/group
  { id:1,  stage:"Group A", date:"2026-06-12", time:"06:00",  teamA:"Mexico",       flagA:f("mx"), teamB:"Ecuador",      flagB:f("ec"), city:"LA",     venue:"SoFi Stadium" },
  { id:2,  stage:"Group B", date:"2026-06-12", time:"23:00",  teamA:"USA",          flagA:f("us"), teamB:"Canada",       flagB:f("ca"), city:"Dallas", venue:"AT&T Stadium" },
  { id:3,  stage:"Group C", date:"2026-06-13", time:"03:00",  teamA:"Spain",        flagA:f("es"), teamB:"Uruguay",      flagB:f("uy"), city:"NY",     venue:"MetLife Stadium" },
  { id:4,  stage:"Group D", date:"2026-06-13", time:"21:00",  teamA:"Argentina",    flagA:f("ar"), teamB:"Saudi Arabia", flagB:f("sa"), city:"LA",     venue:"Rose Bowl" },
  { id:5,  stage:"Group E", date:"2026-06-14", time:"00:00",  teamA:"France",       flagA:f("fr"), teamB:"Colombia",     flagB:f("co"), city:"SF",     venue:"Levi's Stadium" },
  { id:6,  stage:"Group F", date:"2026-06-14", time:"03:00",  teamA:"Germany",      flagA:f("de"), teamB:"Japan",        flagB:f("jp"), city:"LA",     venue:"SoFi Stadium" },
  { id:7,  stage:"Group G", date:"2026-06-14", time:"21:00",  teamA:"England",      flagA:f("gb-eng"), teamB:"Senegal", flagB:f("sn"), city:"Boston", venue:"Gillette Stadium" },
  { id:8,  stage:"Group H", date:"2026-06-15", time:"00:00",  teamA:"Portugal",     flagA:f("pt"), teamB:"Ivory Coast",  flagB:f("ci"), city:"Dallas", venue:"AT&T Stadium" },
  { id:9,  stage:"Group A", date:"2026-06-15", time:"03:00",  teamA:"Argentina",    flagA:f("ar"), teamB:"South Africa", flagB:f("za"), city:"Miami",  venue:"Hard Rock Stadium" },
  { id:10, stage:"Group B", date:"2026-06-15", time:"21:00",  teamA:"Brazil",       flagA:f("br"), teamB:"Croatia",      flagB:f("hr"), city:"LA",     venue:"SoFi Stadium" },
  { id:11, stage:"Group C", date:"2026-06-16", time:"00:00",  teamA:"Netherlands",  flagA:f("nl"), teamB:"Qatar",        flagB:f("qa"), city:"Philly", venue:"Lincoln Financial" },
  { id:12, stage:"Group D", date:"2026-06-16", time:"03:00",  teamA:"Morocco",      flagA:f("ma"), teamB:"Ukraine",      flagB:f("ua"), city:"SF",     venue:"Levi's Stadium" },
  { id:13, stage:"Group E", date:"2026-06-16", time:"21:00",  teamA:"Belgium",      flagA:f("be"), teamB:"Mexico",       flagB:f("mx"), city:"NY",     venue:"MetLife Stadium" },
  { id:14, stage:"Group F", date:"2026-06-17", time:"00:00",  teamA:"Italy",        flagA:f("it"), teamB:"Ecuador",      flagB:f("ec"), city:"Dallas", venue:"AT&T Stadium" },
  { id:15, stage:"Group G", date:"2026-06-17", time:"03:00",  teamA:"Australia",    flagA:f("au"), teamB:"Colombia",     flagB:f("co"), city:"LA",     venue:"SoFi Stadium" },
  { id:16, stage:"Group H", date:"2026-06-17", time:"21:00",  teamA:"South Korea",  flagA:f("kr"), teamB:"Poland",       flagB:f("pl"), city:"Boston", venue:"Gillette Stadium" },
  { id:17, stage:"Group A", date:"2026-06-18", time:"00:00",  teamA:"Canada",       flagA:f("ca"), teamB:"Senegal",      flagB:f("sn"), city:"Miami",  venue:"Hard Rock Stadium" },
  { id:18, stage:"Group B", date:"2026-06-18", time:"03:00",  teamA:"Spain",        flagA:f("es"), teamB:"Saudi Arabia", flagB:f("sa"), city:"SF",     venue:"Levi's Stadium" },
  { id:19, stage:"Group C", date:"2026-06-18", time:"21:00",  teamA:"USA",          flagA:f("us"), teamB:"Ghana",        flagB:f("gh"), city:"NY",     venue:"MetLife Stadium" },
  { id:20, stage:"Group D", date:"2026-06-19", time:"00:00",  teamA:"France",       flagA:f("fr"), teamB:"Japan",        flagB:f("jp"), city:"LA",     venue:"Rose Bowl" },
  { id:21, stage:"Group E", date:"2026-06-19", time:"03:00",  teamA:"Germany",      flagA:f("de"), teamB:"Uruguay",      flagB:f("uy"), city:"Philly", venue:"Lincoln Financial" },
  { id:22, stage:"Group F", date:"2026-06-19", time:"21:00",  teamA:"England",      flagA:f("gb-eng"), teamB:"Qatar",   flagB:f("qa"), city:"Boston", venue:"Gillette Stadium" },
  { id:23, stage:"Group G", date:"2026-06-20", time:"00:00",  teamA:"Portugal",     flagA:f("pt"), teamB:"Ivory Coast",  flagB:f("ci"), city:"Dallas", venue:"AT&T Stadium" },
  { id:24, stage:"Group H", date:"2026-06-20", time:"03:00",  teamA:"Netherlands",  flagA:f("nl"), teamB:"Morocco",      flagB:f("ma"), city:"LA",     venue:"SoFi Stadium" },
  { id:25, stage:"Group A", date:"2026-06-20", time:"21:00",  teamA:"Croatia",      flagA:f("hr"), teamB:"Ivory Coast",  flagB:f("ci"), city:"Miami",  venue:"Hard Rock Stadium" },
  { id:26, stage:"Group B", date:"2026-06-21", time:"00:00",  teamA:"Brazil",       flagA:f("br"), teamB:"South Africa", flagB:f("za"), city:"NY",     venue:"MetLife Stadium" },
  { id:27, stage:"Group C", date:"2026-06-21", time:"03:00",  teamA:"Belgium",      flagA:f("be"), teamB:"Poland",       flagB:f("pl"), city:"SF",     venue:"Levi's Stadium" },
  { id:28, stage:"Group D", date:"2026-06-21", time:"21:00",  teamA:"Argentina",    flagA:f("ar"), teamB:"Colombia",     flagB:f("co"), city:"LA",     venue:"Rose Bowl" },
  { id:29, stage:"Group E", date:"2026-06-22", time:"00:00",  teamA:"Mexico",       flagA:f("mx"), teamB:"Japan",        flagB:f("jp"), city:"Dallas", venue:"AT&T Stadium" },
  { id:30, stage:"Group F", date:"2026-06-22", time:"03:00",  teamA:"Italy",        flagA:f("it"), teamB:"Ukraine",      flagB:f("ua"), city:"Philly", venue:"Lincoln Financial" },
  { id:31, stage:"Group G", date:"2026-06-22", time:"21:00",  teamA:"Spain",        flagA:f("es"), teamB:"Ghana",        flagB:f("gh"), city:"Boston", venue:"Gillette Stadium" },
  { id:32, stage:"Group H", date:"2026-06-23", time:"00:00",  teamA:"Australia",    flagA:f("au"), teamB:"Saudi Arabia", flagB:f("sa"), city:"LA",     venue:"SoFi Stadium" },
  { id:33, stage:"Group A", date:"2026-06-23", time:"03:00",  teamA:"France",       flagA:f("fr"), teamB:"Netherlands",  flagB:f("nl"), city:"Miami",  venue:"Hard Rock Stadium" },
  { id:34, stage:"Group B", date:"2026-06-23", time:"21:00",  teamA:"South Korea",  flagA:f("kr"), teamB:"Ecuador",      flagB:f("ec"), city:"NY",     venue:"MetLife Stadium" },
  { id:35, stage:"Group C", date:"2026-06-24", time:"00:00",  teamA:"Portugal",     flagA:f("pt"), teamB:"Morocco",      flagB:f("ma"), city:"LA",     venue:"Rose Bowl" },
  { id:36, stage:"Group D", date:"2026-06-24", time:"03:00",  teamA:"USA",          flagA:f("us"), teamB:"Uruguay",      flagB:f("uy"), city:"SF",     venue:"Levi's Stadium" },
  { id:37, stage:"Group E", date:"2026-06-24", time:"21:00",  teamA:"England",      flagA:f("gb-eng"), teamB:"Croatia", flagB:f("hr"), city:"Dallas", venue:"AT&T Stadium" },
  { id:38, stage:"Group F", date:"2026-06-25", time:"00:00",  teamA:"Brazil",       flagA:f("br"), teamB:"Belgium",      flagB:f("be"), city:"Philly", venue:"Lincoln Financial" },
  { id:39, stage:"Group G", date:"2026-06-25", time:"03:00",  teamA:"Germany",      flagA:f("de"), teamB:"Qatar",        flagB:f("qa"), city:"Boston", venue:"Gillette Stadium" },
  { id:40, stage:"Group H", date:"2026-06-25", time:"21:00",  teamA:"Colombia",     flagA:f("co"), teamB:"Ukraine",      flagB:f("ua"), city:"LA",     venue:"SoFi Stadium" },
  { id:41, stage:"Group A", date:"2026-06-26", time:"00:00",  teamA:"Canada",       flagA:f("ca"), teamB:"Poland",       flagB:f("pl"), city:"Miami",  venue:"Hard Rock Stadium" },
  { id:42, stage:"Group B", date:"2026-06-26", time:"03:00",  teamA:"Mexico",       flagA:f("mx"), teamB:"South Africa", flagB:f("za"), city:"LA",     venue:"Rose Bowl" },
  { id:43, stage:"Group C", date:"2026-06-26", time:"21:00",  teamA:"Argentina",    flagA:f("ar"), teamB:"Ivory Coast",  flagB:f("ci"), city:"NY",     venue:"MetLife Stadium" },
  { id:44, stage:"Group D", date:"2026-06-27", time:"00:00",  teamA:"Spain",        flagA:f("es"), teamB:"Croatia",      flagB:f("hr"), city:"SF",     venue:"Levi's Stadium" },
  { id:45, stage:"Group E", date:"2026-06-27", time:"03:00",  teamA:"France",       flagA:f("fr"), teamB:"Saudi Arabia", flagB:f("sa"), city:"Dallas", venue:"AT&T Stadium" },
  { id:46, stage:"Group F", date:"2026-06-27", time:"21:00",  teamA:"Italy",        flagA:f("it"), teamB:"Japan",        flagB:f("jp"), city:"Philly", venue:"Lincoln Financial" },
  { id:47, stage:"Group G", date:"2026-06-28", time:"00:00",  teamA:"USA",          flagA:f("us"), teamB:"Portugal",     flagB:f("pt"), city:"LA",     venue:"Rose Bowl" },
  { id:48, stage:"Group H", date:"2026-06-28", time:"03:00",  teamA:"Germany",      flagA:f("de"), teamB:"Morocco",      flagB:f("ma"), city:"NY",     venue:"MetLife Stadium" },
  { id:49, stage:"Group A", date:"2026-06-29", time:"00:00",  teamA:"Ecuador",      flagA:f("ec"), teamB:"Australia",    flagB:f("au"), city:"Boston", venue:"Gillette Stadium" },
  { id:50, stage:"Group B", date:"2026-06-29", time:"03:00",  teamA:"Canada",       flagA:f("ca"), teamB:"Ghana",        flagB:f("gh"), city:"LA",     venue:"SoFi Stadium" },
  { id:51, stage:"Group C", date:"2026-06-30", time:"00:00",  teamA:"Netherlands",  flagA:f("nl"), teamB:"Uruguay",      flagB:f("uy"), city:"Dallas", venue:"AT&T Stadium" },
  { id:52, stage:"Group D", date:"2026-06-30", time:"03:00",  teamA:"Brazil",       flagA:f("br"), teamB:"Qatar",        flagB:f("qa"), city:"Miami",  venue:"Hard Rock Stadium" },
  { id:53, stage:"Group E", date:"2026-07-01", time:"00:00",  teamA:"Belgium",      flagA:f("be"), teamB:"Croatia",      flagB:f("hr"), city:"SF",     venue:"Levi's Stadium" },
  { id:54, stage:"Group F", date:"2026-07-01", time:"03:00",  teamA:"England",      flagA:f("gb-eng"), teamB:"South Korea",flagB:f("kr"), city:"LA",  venue:"Rose Bowl" },
  { id:55, stage:"Group G", date:"2026-07-02", time:"00:00",  teamA:"Argentina",    flagA:f("ar"), teamB:"Mexico",       flagB:f("mx"), city:"NY",     venue:"MetLife Stadium" },
  { id:56, stage:"Group H", date:"2026-07-02", time:"03:00",  teamA:"Spain",        flagA:f("es"), teamB:"Saudi Arabia", flagB:f("sa"), city:"Philly", venue:"Lincoln Financial" },
  { id:57, stage:"Group A", date:"2026-07-03", time:"00:00",  teamA:"Italy",        flagA:f("it"), teamB:"Colombia",     flagB:f("co"), city:"LA",     venue:"SoFi Stadium" },
  { id:58, stage:"Group B", date:"2026-07-03", time:"03:00",  teamA:"France",       flagA:f("fr"), teamB:"Australia",    flagB:f("au"), city:"Boston", venue:"Gillette Stadium" },
  // ROUND OF 32
  { id:59, stage:"Round of 32", date:"2026-07-06", time:"03:00",  teamA:"1A", flagA:f("xx"), teamB:"2B", flagB:f("xx"), city:"NY",     venue:"MetLife Stadium" },
  { id:60, stage:"Round of 32", date:"2026-07-06", time:"21:00",  teamA:"1B", flagA:f("xx"), teamB:"2A", flagB:f("xx"), city:"LA",     venue:"SoFi Stadium" },
  { id:61, stage:"Round of 32", date:"2026-07-07", time:"03:00",  teamA:"1C", flagA:f("xx"), teamB:"2D", flagB:f("xx"), city:"Dallas", venue:"AT&T Stadium" },
  { id:62, stage:"Round of 32", date:"2026-07-07", time:"21:00",  teamA:"1D", flagA:f("xx"), teamB:"2C", flagB:f("xx"), city:"LA",     venue:"Rose Bowl" },
  { id:63, stage:"Round of 32", date:"2026-07-08", time:"03:00",  teamA:"1E", flagA:f("xx"), teamB:"2F", flagB:f("xx"), city:"Miami",  venue:"Hard Rock Stadium" },
  { id:64, stage:"Round of 32", date:"2026-07-08", time:"21:00",  teamA:"1F", flagA:f("xx"), teamB:"2E", flagB:f("xx"), city:"SF",     venue:"Levi's Stadium" },
  { id:65, stage:"Round of 32", date:"2026-07-09", time:"03:00",  teamA:"1G", flagA:f("xx"), teamB:"2H", flagB:f("xx"), city:"Philly", venue:"Lincoln Financial" },
  { id:66, stage:"Round of 32", date:"2026-07-09", time:"21:00",  teamA:"1H", flagA:f("xx"), teamB:"2G", flagB:f("xx"), city:"Boston", venue:"Gillette Stadium" },
  // ROUND OF 16
  { id:67, stage:"Round of 16", date:"2026-07-11", time:"03:00",  teamA:"W59",flagA:f("xx"), teamB:"W60",flagB:f("xx"), city:"NY",     venue:"MetLife Stadium" },
  { id:68, stage:"Round of 16", date:"2026-07-11", time:"21:00",  teamA:"W61",flagA:f("xx"), teamB:"W62",flagB:f("xx"), city:"LA",     venue:"SoFi Stadium" },
  { id:69, stage:"Round of 16", date:"2026-07-12", time:"03:00",  teamA:"W63",flagA:f("xx"), teamB:"W64",flagB:f("xx"), city:"Dallas", venue:"AT&T Stadium" },
  { id:70, stage:"Round of 16", date:"2026-07-12", time:"21:00",  teamA:"W65",flagA:f("xx"), teamB:"W66",flagB:f("xx"), city:"LA",     venue:"Rose Bowl" },
  // QUARTER-FINALS
  { id:71, stage:"Quarter-Final", date:"2026-07-16", time:"03:00", teamA:"W67",flagA:f("xx"), teamB:"W68",flagB:f("xx"), city:"NY",    venue:"MetLife Stadium" },
  { id:72, stage:"Quarter-Final", date:"2026-07-16", time:"21:00", teamA:"W69",flagA:f("xx"), teamB:"W70",flagB:f("xx"), city:"LA",    venue:"SoFi Stadium" },
  { id:73, stage:"Quarter-Final", date:"2026-07-17", time:"03:00", teamA:"W71",flagA:f("xx"), teamB:"W72",flagB:f("xx"), city:"Dallas",venue:"AT&T Stadium" },
  { id:74, stage:"Quarter-Final", date:"2026-07-17", time:"21:00", teamA:"W73",flagA:f("xx"), teamB:"W74",flagB:f("xx"), city:"LA",    venue:"Rose Bowl" },
  // SEMI-FINALS
  { id:75, stage:"Semi-Final",    date:"2026-07-21", time:"05:30", teamA:"W71",flagA:f("xx"), teamB:"W72",flagB:f("xx"), city:"NY",    venue:"MetLife Stadium" },
  { id:76, stage:"Semi-Final",    date:"2026-07-22", time:"05:30", teamA:"W73",flagA:f("xx"), teamB:"W74",flagB:f("xx"), city:"LA",    venue:"Rose Bowl" },
  // 3RD PLACE
  { id:77, stage:"3rd Place",     date:"2026-07-25", time:"04:00", teamA:"L75",flagA:f("xx"), teamB:"L76",flagB:f("xx"), city:"Dallas",venue:"AT&T Stadium" },
  // FINAL
  { id:78, stage:"⭐ Final",      date:"2026-07-26", time:"05:00", teamA:"W75",flagA:f("xx"), teamB:"W76",flagB:f("xx"), city:"NY",    venue:"MetLife Stadium" },
];

// ─── Time helpers ─────────────────────────────────────────────────
function bdNow() {
  const utcMs = Date.now() + new Date().getTimezoneOffset() * 60_000;
  return new Date(utcMs + 6 * 3600_000);
}
function matchStart(m: Match) { return new Date(`${m.date}T${m.time}:00+06:00`); }
function isOver(m: Match)  { return matchStart(m) < bdNow(); }
function isLive(m: Match)  { const s = matchStart(m).getTime(), n = bdNow().getTime(); return n >= s && n <= s + 110*60000; }

// ─── Group matches by date ────────────────────────────────────────
function groupByDate(matches: Match[]): { date: string; matches: Match[] }[] {
  const map: Record<string, Match[]> = {};
  for (const m of matches) (map[m.date] ??= []).push(m);
  return Object.keys(map).sort().map(date => ({ date, matches: map[date] }));
}

// ─── Find page index for today ────────────────────────────────────
function todayPageIndex(pages: { date: string; matches: Match[] }[][]): number {
  const today = bdNow().toISOString().slice(0,10);
  const idx = pages.findIndex(pg => pg.some(d => d.date >= today));
  return idx >= 0 ? idx : 0;
}

// ─── Countdown ────────────────────────────────────────────────────
function Countdown({ match }: { match: Match }) {
  const [ms, setMs] = useState(() => matchStart(match).getTime() - bdNow().getTime());
  useEffect(() => {
    const id = setInterval(() => setMs(matchStart(match).getTime() - bdNow().getTime()), 1000);
    return () => clearInterval(id);
  }, [match]);

  if (isLive(match)) return (
    <div className="flex items-center justify-center gap-2">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-80" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-green-400" style={{boxShadow:"0 0 8px #4ade80,0 0 16px #4ade80"}} />
      </span>
      <span className="text-sm font-black uppercase tracking-widest text-green-300" style={{textShadow:"0 0 12px rgba(74,222,128,0.8)"}}>LIVE</span>
    </div>
  );

  if (ms <= 0) return (
    <div className="text-center font-bold text-white/30 text-xs uppercase tracking-widest">Full Time</div>
  );

  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), mi = Math.floor((s % 3600) / 60), sc = s % 60;
  const pad = (n: number) => String(n).padStart(2,"0");

  const units = d > 0
    ? [{ v: pad(d), l:"D" }, { v: pad(h), l:"H" }, { v: pad(mi), l:"M" }]
    : [{ v: pad(h), l:"H" }, { v: pad(mi), l:"M" }, { v: pad(sc), l:"S" }];

  return (
    <div className="flex items-end gap-1">
      {units.map((u, i) => (
        <div key={u.l} className="flex items-end">
          <div className="flex flex-col items-center">
            <span className="font-mono text-[22px] font-black leading-none tabular-nums text-white" style={{
              fontFamily:"'SF Mono','Fira Code','Cascadia Code',monospace",
              textShadow:"0 0 20px rgba(167,139,250,0.6)",
            }}>{u.v}</span>
            <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.15em] text-violet-400/70">{u.l}</span>
          </div>
          {i < units.length - 1 && (
            <span className="mb-4 mx-0.5 text-lg font-black text-violet-400/50 leading-none">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Score display ────────────────────────────────────────────────
function Score({ a, b }: { a: number; b: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[26px] font-black text-white" style={{textShadow:"0 0 16px rgba(255,255,255,0.3)"}}>{a}</span>
      <span className="text-base text-white/25 font-light">—</span>
      <span className="font-mono text-[26px] font-black text-white" style={{textShadow:"0 0 16px rgba(255,255,255,0.3)"}}>{b}</span>
    </div>
  );
}

// ─── Stage badge style ────────────────────────────────────────────
const STAGE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  "⭐ Final":      { bg:"rgba(251,191,36,0.15)", border:"rgba(251,191,36,0.4)", color:"#fbbf24" },
  "Semi-Final":    { bg:"rgba(167,139,250,0.12)", border:"rgba(167,139,250,0.4)", color:"#c4b5fd" },
  "Quarter-Final": { bg:"rgba(139,92,246,0.10)", border:"rgba(139,92,246,0.3)", color:"#a78bfa" },
  "Round of 16":   { bg:"rgba(99,102,241,0.10)", border:"rgba(99,102,241,0.3)", color:"#818cf8" },
  "Round of 32":   { bg:"rgba(79,82,221,0.08)", border:"rgba(79,82,221,0.25)", color:"#6366f1" },
};
function stageStyle(stage: string) {
  return STAGE_STYLE[stage] ?? { bg:"rgba(255,255,255,0.05)", border:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)" };
}

// ─── Match card ───────────────────────────────────────────────────
function MatchCard({ match, isToday }: { match: Match; isToday: boolean }) {
  const over = isOver(match), live = isLive(match), final = match.stage === "⭐ Final";
  const hasScore = match.scoreA !== undefined && match.scoreB !== undefined;
  const ss = stageStyle(match.stage);
  const d = new Date(`${match.date}T${match.time}:00+06:00`);
  const timeLabel = d.toLocaleTimeString("en-BD", { hour:"2-digit", minute:"2-digit", hour12:true, timeZone:"Asia/Dhaka" });

  return (
    <div className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01]"
      style={{
        background: live
          ? "linear-gradient(135deg,rgba(15,40,15,0.7),rgba(10,30,10,0.6))"
          : over
          ? "rgba(255,255,255,0.025)"
          : isToday
          ? "linear-gradient(135deg,rgba(139,92,246,0.14),rgba(79,42,201,0.08))"
          : "rgba(255,255,255,0.04)",
        border: `1px solid ${live ? "rgba(74,222,128,0.35)" : isToday ? "rgba(139,92,246,0.30)" : over ? "rgba(255,255,255,0.05)" : "rgba(139,92,246,0.15)"}`,
        boxShadow: live
          ? "0 0 24px rgba(74,222,128,0.14),0 4px 16px rgba(0,0,0,0.4)"
          : final
          ? "0 0 24px rgba(251,191,36,0.10),0 4px 16px rgba(0,0,0,0.4)"
          : isToday
          ? "0 0 16px rgba(139,92,246,0.12),0 4px 12px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.25)",
      }}>

      {/* Top shimmer line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)" }} />

      {/* Live glow pulse overlay */}
      {live && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow:"inset 0 0 30px rgba(74,222,128,0.08)", animation:"liveGlow 2s ease-in-out infinite" }} />
      )}

      <div className="px-4 py-3">
        {/* Stage + time row */}
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ background:ss.bg, border:`1px solid ${ss.border}`, color:ss.color }}>{match.stage}</span>
          <div className="flex items-center gap-1.5 text-right">
            <span className="text-[10px] text-white/35">{timeLabel} BD</span>
            <span className="text-white/15">·</span>
            <span className="text-[10px] text-white/25">{match.city}</span>
          </div>
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-between gap-2">
          {/* Team A */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="relative">
              <img src={match.flagA} alt={match.teamA} className="h-8 w-12 rounded object-cover shadow-lg sm:h-9 sm:w-14"
                style={{ border:"1px solid rgba(255,255,255,0.12)" }}
                onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
            </div>
            <span className={`w-full truncate text-center text-[11px] font-bold leading-tight ${over ? "text-white/50" : "text-white/90"}`}>
              {match.teamA}
            </span>
          </div>

          {/* Centre */}
          <div className="flex shrink-0 flex-col items-center gap-1 px-2">
            {over && hasScore ? <Score a={match.scoreA!} b={match.scoreB!} /> :
             over ? (
               <div className="text-[11px] font-bold uppercase tracking-widest text-white/25">FT</div>
             ) : (
               <Countdown match={match} />
             )}
            {over && !live && (
              <span className="text-[9px] font-semibold uppercase tracking-widest text-white/25">
                {hasScore ? "Final Score" : "Full Time"}
              </span>
            )}
          </div>

          {/* Team B */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="relative">
              <img src={match.flagB} alt={match.teamB} className="h-8 w-12 rounded object-cover shadow-lg sm:h-9 sm:w-14"
                style={{ border:"1px solid rgba(255,255,255,0.12)" }}
                onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
            </div>
            <span className={`w-full truncate text-center text-[11px] font-bold leading-tight ${over ? "text-white/50" : "text-white/90"}`}>
              {match.teamB}
            </span>
          </div>
        </div>

        {/* Venue */}
        <div className="mt-2 text-center text-[9px] text-white/20">{match.venue}</div>
      </div>

      <style>{`
        @keyframes liveGlow {
          0%,100%{box-shadow:inset 0 0 20px rgba(74,222,128,0.06)}
          50%{box-shadow:inset 0 0 35px rgba(74,222,128,0.14)}
        }
      `}</style>
    </div>
  );
}

// ─── Day column ───────────────────────────────────────────────────
function DayColumn({ dayGroup, todayBD }: { dayGroup: { date: string; matches: Match[] }; todayBD: string }) {
  const isToday = dayGroup.date === todayBD;
  const d = new Date(dayGroup.date + "T12:00:00+06:00");
  const weekday = d.toLocaleDateString("en-BD", { weekday:"long", timeZone:"Asia/Dhaka" });
  const monthDay = d.toLocaleDateString("en-BD", { month:"short", day:"numeric", timeZone:"Asia/Dhaka" });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {/* Day header */}
      <div className="flex flex-col items-center gap-1 rounded-xl py-2.5 px-3"
        style={{
          background: isToday ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${isToday ? "rgba(139,92,246,0.40)" : "rgba(255,255,255,0.07)"}`,
          boxShadow: isToday ? "0 0 20px rgba(139,92,246,0.15)" : "none",
        }}>
        {isToday && (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
            <span className="text-[9px] font-black uppercase tracking-widest text-violet-300">Today</span>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          </div>
        )}
        <span className={`text-xs font-bold ${isToday ? "text-violet-200" : "text-white/60"}`}>{weekday}</span>
        <span className={`text-[11px] font-semibold ${isToday ? "text-violet-300/80" : "text-white/35"}`}>{monthDay}</span>
        <span className="mt-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold text-white/40"
          style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.08)" }}>
          {dayGroup.matches.length} match{dayGroup.matches.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Match cards */}
      <div className="flex flex-col gap-2.5">
        {dayGroup.matches.map(m => <MatchCard key={m.id} match={m} isToday={isToday} />)}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export default function FifaSchedule() {
  const allDays = groupByDate(MATCHES);
  // Chunk into pages of 3 days
  const pages: { date: string; matches: Match[] }[][] = [];
  for (let i = 0; i < allDays.length; i += 3) pages.push(allDays.slice(i, i + 3));

  const todayBD = bdNow().toISOString().slice(0,10);
  const [page, setPage] = useState(() => todayPageIndex(pages));
  const [dir, setDir] = useState<1 | -1>(1);
  const [animKey, setAnimKey] = useState(0);
  const [, tick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tick every 30s for live detection
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const navigate = (delta: 1 | -1) => {
    const next = page + delta;
    if (next < 0 || next >= pages.length) return;
    setDir(delta);
    setAnimKey(k => k + 1);
    setPage(next);
  };

  const current = pages[page] ?? [];
  // Find if any match today is live
  const hasLive = MATCHES.some(m => isLive(m));

  const pageStart = current[0]?.date ?? "";
  const pageEnd   = current[current.length-1]?.date ?? "";
  const fmtD = (s: string) => {
    if (!s) return "";
    const d = new Date(s + "T12:00:00+06:00");
    return d.toLocaleDateString("en-BD", { month:"short", day:"numeric", timeZone:"Asia/Dhaka" });
  };

  return (
    <section className="mt-8 sm:mt-10">
      {/* Section header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-xl"
            style={{ background:"linear-gradient(135deg,rgba(139,92,246,0.3),rgba(99,62,221,0.2))", border:"1px solid rgba(139,92,246,0.35)", boxShadow:"0 0 16px rgba(139,92,246,0.2)" }}>⚽</div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white sm:text-lg">FIFA World Cup 2026</h2>
              {hasLive && (
                <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
                  style={{ background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.3)" }}>
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-green-400 opacity-80" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-green-300">Live</span>
                </div>
              )}
            </div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">Schedule · Bangladesh Standard Time (UTC+6)</p>
          </div>
        </div>

        {/* Page range label */}
        <div className="text-right text-[11px] text-white/35">
          <span>{fmtD(pageStart)}</span>
          {pageStart !== pageEnd && <><span className="mx-1 text-white/20">–</span><span>{fmtD(pageEnd)}</span></>}
        </div>
      </div>

      {/* Navigation + content */}
      <div className="flex items-stretch gap-2 sm:gap-3">
        {/* Prev arrow */}
        <button onClick={() => navigate(-1)} disabled={page === 0}
          className="flex w-9 shrink-0 flex-col items-center justify-center rounded-xl transition-all duration-200 active:scale-95"
          style={{
            background: page === 0 ? "rgba(255,255,255,0.02)" : "rgba(139,92,246,0.12)",
            border: `1px solid ${page === 0 ? "rgba(255,255,255,0.05)" : "rgba(139,92,246,0.25)"}`,
            opacity: page === 0 ? 0.3 : 1,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={page===0?"rgba(255,255,255,0.3)":"rgba(167,139,250,0.9)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        {/* Days grid */}
        <div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
          <div key={animKey} className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${current.length},1fr)`,
              animation: `slideIn${dir > 0 ? "Right" : "Left"} 320ms cubic-bezier(.4,0,.2,1)`,
            }}>
            {current.map(dayGroup => (
              <DayColumn key={dayGroup.date} dayGroup={dayGroup} todayBD={todayBD} />
            ))}
          </div>
        </div>

        {/* Next arrow */}
        <button onClick={() => navigate(1)} disabled={page >= pages.length - 1}
          className="flex w-9 shrink-0 flex-col items-center justify-center rounded-xl transition-all duration-200 active:scale-95"
          style={{
            background: page >= pages.length-1 ? "rgba(255,255,255,0.02)" : "rgba(139,92,246,0.12)",
            border: `1px solid ${page >= pages.length-1 ? "rgba(255,255,255,0.05)" : "rgba(139,92,246,0.25)"}`,
            opacity: page >= pages.length-1 ? 0.3 : 1,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={page>=pages.length-1?"rgba(255,255,255,0.3)":"rgba(167,139,250,0.9)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      {/* Page dots */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        {pages.map((_, i) => (
          <button key={i} onClick={() => { setDir(i > page ? 1 : -1); setAnimKey(k=>k+1); setPage(i); }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === page ? "20px" : "6px",
              height: "6px",
              background: i === page ? "rgba(139,92,246,0.8)" : "rgba(255,255,255,0.15)",
              boxShadow: i === page ? "0 0 8px rgba(139,92,246,0.5)" : "none",
            }} />
        ))}
      </div>

      <p className="mt-4 text-center text-[10px] text-white/20">
        All times in Bangladesh Standard Time · Bracket TBD after group stage
      </p>

      <style>{`
        @keyframes slideInRight {
          from { opacity:0; transform:translateX(32px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity:0; transform:translateX(-32px); }
          to   { opacity:1; transform:translateX(0); }
        }
      `}</style>
    </section>
  );
}
