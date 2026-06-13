import { useEffect, useRef, useState } from "react";
import { FooterCredits } from "./Footer";

// ─── Types ────────────────────────────────────────────────────────
interface Match {
  id: number;
  stage: string;
  date: string;      // YYYY-MM-DD (BD date)
  time: string;      // HH:MM  24h BD
  teamA: string;
  teamB: string;
  flagA: string;
  flagB: string;
  venue: string;
  city: string;
  scoreA?: number;
  scoreB?: number;
}

const f = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

const MATCHES: Match[] = [
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

function groupByDate(matches: Match[]): { date: string; matches: Match[] }[] {
  const map: Record<string, Match[]> = {};
  for (const m of matches) (map[m.date] ??= []).push(m);
  return Object.keys(map).sort().map(date => ({ date, matches: map[date] }));
}

function todayPageIndex(pages: { date: string; matches: Match[] }[][], colsPerPage: number): number {
  const today = bdNow().toISOString().slice(0,10);
  const idx = pages.findIndex(pg => pg.some(d => d.date >= today));
  return idx >= 0 ? idx : 0;
}

// ─── Responsive cols per page ─────────────────────────────────────
function useColsPerPage() {
  const [cols, setCols] = useState(() => window.innerWidth < 640 ? 1 : 3);
  useEffect(() => {
    const update = () => setCols(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 1 : 3);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

// ─── Countdown ─────────────────────────────────────────────────────
function Countdown({ match }: { match: Match }) {
  const [ms, setMs] = useState(() => matchStart(match).getTime() - bdNow().getTime());
  useEffect(() => {
    const id = setInterval(() => setMs(matchStart(match).getTime() - bdNow().getTime()), 1000);
    return () => clearInterval(id);
  }, [match]);

  if (isLive(match)) return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative h-2 w-2 rounded-full bg-green-400" style={{boxShadow:"0 0 6px #4ade80,0 0 12px #4ade80"}} />
      </span>
      <span style={{fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif", fontSize:"13px", fontWeight:700, letterSpacing:"0.12em", color:"#86efac", textShadow:"0 0 10px rgba(74,222,128,0.7)"}}>LIVE</span>
    </div>
  );

  if (ms <= 0) return (
    <div style={{fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif", fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", color:"rgba(255,255,255,0.25)", textTransform:"uppercase", textAlign:"center", lineHeight:1, padding:"2px 4px"}}>Full Time</div>
  );

  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const mi = Math.floor((totalSec % 3600) / 60);
  const sc = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2,"0");

  // Always show Day, Hours, Min, Second — but only show Day col if d>0
  const units = d > 0
    ? [{ v: pad(d), l:"Day" }, { v: pad(h), l:"Hours" }, { v: pad(mi), l:"Min" }, { v: pad(sc), l:"Second" }]
    : [{ v: pad(h), l:"Hours" }, { v: pad(mi), l:"Min" }, { v: pad(sc), l:"Second" }];

  const numSz = d > 0 ? "20px" : "24px";
  const colSz = d > 0 ? "16px" : "19px";
  const colW  = d > 0 ? "30px" : "36px";

  return (
    <div style={{ display:"flex", alignItems:"center", gap:0 }}>
      {units.map((u, i) => (
        <div key={u.l} style={{ display:"flex", alignItems:"center" }}>
          {/* Number + label column */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", width: colW }}>
            <span style={{
              fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif",
              fontSize: numSz,
              fontWeight:800,
              lineHeight:"1.1",
              color:"#fff",
              textShadow:"0 0 16px rgba(167,139,250,0.55)",
              letterSpacing:"-0.02em",
              fontVariantNumeric:"tabular-nums",
              textAlign:"center",
              display:"block",
              width:"100%",
            }}>{u.v}</span>
            <span style={{
              fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif",
              fontSize:"7.5px",
              fontWeight:700,
              letterSpacing:"0.10em",
              color:"rgba(167,139,250,0.65)",
              textTransform:"uppercase",
              marginTop:"2px",
              display:"block",
              textAlign:"center",
              width:"100%",
              whiteSpace:"nowrap",
            }}>{u.l}</span>
          </div>
          {/* Colon separator — aligned with the number row */}
          {i < units.length - 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:"12px", height: numSz, marginBottom: "11px" }}>
              <span style={{
                color:"rgba(167,139,250,0.45)",
                fontSize: colSz,
                fontWeight:700,
                lineHeight:"1",
                display:"block",
                textAlign:"center",
              }}>:</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Score display ────────────────────────────────────────────────
function Score({ a, b, live, big }: { a: number; b: number; live?: boolean; big?: boolean }) {
  const sz = big ? "22px" : "22px";
  return (
    <div className="flex items-center gap-1.5">
      <span style={{
        fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif",
        fontSize:sz,
        fontWeight:800,
        color: live ? "#86efac" : "#fff",
        textShadow: live ? "0 0 12px rgba(74,222,128,0.6)" : "0 0 12px rgba(255,255,255,0.25)",
        lineHeight:1,
        letterSpacing:"-0.01em",
      }}>{a}</span>
      <span style={{color:"rgba(255,255,255,0.2)", fontSize:"14px", fontWeight:300}}>:</span>
      <span style={{
        fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif",
        fontSize:sz,
        fontWeight:800,
        color: live ? "#86efac" : "#fff",
        textShadow: live ? "0 0 12px rgba(74,222,128,0.6)" : "0 0 12px rgba(255,255,255,0.25)",
        lineHeight:1,
        letterSpacing:"-0.01em",
      }}>{b}</span>
    </div>
  );
}

// ─── Stage badge ──────────────────────────────────────────────────
const STAGE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  "⭐ Final":      { bg:"rgba(251,191,36,0.15)", border:"rgba(251,191,36,0.4)", color:"#fbbf24" },
  "Semi-Final":    { bg:"rgba(167,139,250,0.12)", border:"rgba(167,139,250,0.4)", color:"#c4b5fd" },
  "Quarter-Final": { bg:"rgba(139,92,246,0.10)", border:"rgba(139,92,246,0.3)", color:"#a78bfa" },
  "Round of 16":   { bg:"rgba(99,102,241,0.10)", border:"rgba(99,102,241,0.3)", color:"#818cf8" },
  "Round of 32":   { bg:"rgba(79,82,221,0.08)", border:"rgba(79,82,221,0.25)", color:"#6366f1" },
};
function stageStyle(stage: string) {
  return STAGE_STYLE[stage] ?? { bg:"rgba(255,255,255,0.05)", border:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.45)" };
}

// ─── Match card ───────────────────────────────────────────────────
function MatchCard({ match, isToday }: { match: Match; isToday: boolean }) {
  const over = isOver(match), live = isLive(match), final = match.stage === "⭐ Final";
  const hasScore = match.scoreA !== undefined && match.scoreB !== undefined;
  const ss = stageStyle(match.stage);
  const d = new Date(`${match.date}T${match.time}:00+06:00`);
  const timeLabel = d.toLocaleTimeString("en-BD", { hour:"2-digit", minute:"2-digit", hour12:true, timeZone:"Asia/Dhaka" });

  // Hover-to-reveal result — PC (hover-capable) devices only
  const [showResult, setShowResult] = useState(false);
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const onChange = () => setCanHover(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const canReveal = over && !live && hasScore && canHover;

  return (
    <div
      onMouseEnter={() => { if (canReveal) setShowResult(true); }}
      onMouseLeave={() => { if (canReveal) setShowResult(false); }}
      className="relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01]"
      style={{
        background: live
          ? "linear-gradient(135deg,rgba(15,40,15,0.75),rgba(10,30,10,0.65))"
          : over
          ? "rgba(255,255,255,0.02)"
          : isToday
          ? "linear-gradient(135deg,rgba(139,92,246,0.13),rgba(79,42,201,0.07))"
          : "rgba(255,255,255,0.035)",
        border: `1px solid ${live ? "rgba(74,222,128,0.30)" : isToday ? "rgba(139,92,246,0.28)" : over ? "rgba(255,255,255,0.05)" : "rgba(139,92,246,0.13)"}`,
        boxShadow: live
          ? "0 0 20px rgba(74,222,128,0.12),0 2px 10px rgba(0,0,0,0.4)"
          : final
          ? "0 0 20px rgba(251,191,36,0.08),0 2px 10px rgba(0,0,0,0.4)"
          : isToday
          ? "0 0 14px rgba(139,92,246,0.10),0 2px 8px rgba(0,0,0,0.3)"
          : "0 1px 6px rgba(0,0,0,0.22)",
        // Live card gets a pulse animation
        animation: live ? "cardPulseCPU 3s ease-in-out infinite" : "none",
        cursor: canReveal ? "pointer" : "default",
      }}>

      {/* Top shimmer */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.10),transparent)" }} />

      {/* Live pulse overlay */}
      {live && (
        <div className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ boxShadow:"inset 0 0 28px rgba(74,222,128,0.07)", animation:"liveGlow 2s ease-in-out infinite" }} />
      )}

      <div className="px-3 py-3">
        {/* Top row: stage badge + time + city */}
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {/* Stage · City then Time — time aligned right */}
          <span style={{
            background:ss.bg, border:`1px solid ${ss.border}`, color:ss.color,
            fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif",
            fontSize:"9px", fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase",
            borderRadius:"999px", padding:"2px 8px", display:"inline-block", lineHeight:"1.5",
          }}>{match.stage}</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <span style={{fontFamily:"'Inter',sans-serif", fontSize:"10px", fontWeight:400, color:"rgba(255,255,255,0.22)"}}>{match.city}</span>
            <span style={{color:"rgba(255,255,255,0.12)", fontSize:"10px"}}>·</span>
            <span style={{fontFamily:"'Inter',sans-serif", fontSize:"10px", fontWeight:500, color:"rgba(255,255,255,0.38)"}}>{timeLabel}</span>
          </div>
        </div>

        {/* Teams + score row */}
        <div className="flex items-center justify-between gap-2">
          {/* Team A */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            {/* Flag fades out smoothly while the result is revealed (PC hover only) */}
            <img src={match.flagA} alt={match.teamA}
              className="h-7 w-11 rounded-sm object-cover shadow-md sm:h-8 sm:w-12"
              style={{
                border:"1px solid rgba(255,255,255,0.10)",
                opacity: canReveal && showResult ? 0 : 1,
                transition: "opacity 300ms ease",
              }}
              onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
            <span style={{
              fontFamily:"'Inter',sans-serif", fontSize:"11px", fontWeight:600,
              color: over && !live ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.88)",
              textAlign:"center", lineHeight:"1.2",
              maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block",
            }}>{match.teamA}</span>
          </div>

          {/* Centre: score or countdown */}
          <div className="flex shrink-0 flex-col items-center gap-0.5 px-1">
            {live && hasScore ? (
              <>
                <Score a={match.scoreA!} b={match.scoreB!} live />
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-green-400 opacity-80" />
                  <span style={{fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif", fontSize:"8px", fontWeight:700, letterSpacing:"0.14em", color:"#86efac", textTransform:"uppercase"}}>Live</span>
                </div>
              </>
            ) : over && hasScore ? (
              /* Crossfade between "Full Time" and the final result on hover (PC only) */
              <div className="relative flex items-center justify-center" style={{ minWidth:"56px", minHeight:"30px" }}>
                <span style={{
                  position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                  fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif", fontSize:"11px", fontWeight:700,
                  letterSpacing:"0.12em", color:"rgba(255,255,255,0.28)", textTransform:"uppercase", textAlign:"center",
                  opacity: canReveal && showResult ? 0 : 1,
                  transition: "opacity 300ms ease",
                }}>Full Time</span>
                <div style={{
                  position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
                  opacity: canReveal && showResult ? 1 : 0,
                  transition: "opacity 300ms ease",
                }}>
                  <Score a={match.scoreA!} b={match.scoreB!} big />
                </div>
              </div>
            ) : over ? (
              <span style={{fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif", fontSize:"11px", fontWeight:700, letterSpacing:"0.12em", color:"rgba(255,255,255,0.28)", textTransform:"uppercase", display:"block", textAlign:"center"}}>Full Time</span>
            ) : (
              <Countdown match={match} />
            )}
          </div>

          {/* Team B */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <img src={match.flagB} alt={match.teamB}
              className="h-7 w-11 rounded-sm object-cover shadow-md sm:h-8 sm:w-12"
              style={{
                border:"1px solid rgba(255,255,255,0.10)",
                opacity: canReveal && showResult ? 0 : 1,
                transition: "opacity 300ms ease",
              }}
              onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
            <span style={{
              fontFamily:"'Inter',sans-serif", fontSize:"11px", fontWeight:600,
              color: over && !live ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.88)",
              textAlign:"center", lineHeight:"1.2",
              maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block",
            }}>{match.teamB}</span>
          </div>
        </div>

        {/* Venue */}
        <div style={{fontFamily:"'Inter',sans-serif", fontSize:"9px", color:"rgba(255,255,255,0.17)", fontWeight:400, textAlign:"center", marginTop:"6px", letterSpacing:"0.01em"}}>
          {match.venue}
        </div>
      </div>

      <style>{`
        @keyframes liveGlow {
          0%,100%{box-shadow:inset 0 0 20px rgba(74,222,128,0.05)}
          50%{box-shadow:inset 0 0 32px rgba(74,222,128,0.12)}
        }
        @keyframes cardPulseCPU {
          0%,100%{outline:2px solid rgba(74,222,128,0.15); outline-offset:0px;}
          50%{outline:2px solid rgba(74,222,128,0.42); outline-offset:1px;}
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
  const fullDate = d.toLocaleDateString("en-BD", { month:"long", day:"numeric", year:"numeric", timeZone:"Asia/Dhaka" });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
      {/* Day header */}
      <div className="rounded-lg px-3 py-2.5"
        style={{
          background: isToday ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.035)",
          border: `1px solid ${isToday ? "rgba(139,92,246,0.38)" : "rgba(255,255,255,0.07)"}`,
          boxShadow: isToday ? "0 0 16px rgba(139,92,246,0.13)" : "none",
        }}>
        <div className="flex flex-col gap-0.5">
          <span style={{
            fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif",
            fontSize:"12px",
            fontWeight:700,
            color: isToday ? "#c4b5fd" : "rgba(255,255,255,0.65)",
            letterSpacing:"0.01em",
          }}>{weekday}</span>
          <span style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:"11px",
            fontWeight:500,
            color: isToday ? "rgba(196,181,253,0.75)" : "rgba(255,255,255,0.35)",
            letterSpacing:"0.01em",
          }}>{fullDate}</span>
        </div>
      </div>

      {/* Match cards */}
      <div className="flex flex-col gap-2">
        {dayGroup.matches.map(m => <MatchCard key={m.id} match={m} isToday={isToday} />)}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export default function FifaSchedule() {
  const colsPerPage = useColsPerPage();
  const allDays = groupByDate(MATCHES);

  // Rebuild pages whenever colsPerPage changes
  const pages = (() => {
    const p: { date: string; matches: Match[] }[][] = [];
    for (let i = 0; i < allDays.length; i += colsPerPage) p.push(allDays.slice(i, i + colsPerPage));
    return p;
  })();

  const todayBD = bdNow().toISOString().slice(0,10);
  const [page, setPage] = useState(() => todayPageIndex(pages, colsPerPage));
  const [dir, setDir] = useState<1 | -1>(1);
  const [animKey, setAnimKey] = useState(0);
  const [, tick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset page to today when colsPerPage changes
  useEffect(() => {
    const allDaysLocal = groupByDate(MATCHES);
    const pagesLocal: { date: string; matches: Match[] }[][] = [];
    for (let i = 0; i < allDaysLocal.length; i += colsPerPage) pagesLocal.push(allDaysLocal.slice(i, i + colsPerPage));
    setPage(todayPageIndex(pagesLocal, colsPerPage));
  }, [colsPerPage]);

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
  const hasLive = MATCHES.some(m => isLive(m));

  const pageStart = current[0]?.date ?? "";
  const pageEnd   = current[current.length-1]?.date ?? "";
  const fmtD = (s: string) => {
    if (!s) return "";
    const d = new Date(s + "T12:00:00+06:00");
    return d.toLocaleDateString("en-BD", { month:"short", day:"numeric", timeZone:"Asia/Dhaka" });
  };

  return (
    <section className="mt-10 sm:mt-12">
      {/* ── Section header ── */}
      <div className="mb-6">
        <div className="mb-1.5 flex items-center gap-3">
          <h2 style={{
            fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif",
            fontSize:"clamp(26px,4vw,40px)",
            fontWeight:800,
            letterSpacing:"-0.02em",
            lineHeight:1.1,
            background:"linear-gradient(135deg,#fff 30%,rgba(167,139,250,0.85) 100%)",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",
            backgroundClip:"text",
          }}>FIFA 2026 Schedule</h2>
          {hasLive && (
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background:"rgba(74,222,128,0.12)", border:"1px solid rgba(74,222,128,0.28)" }}>
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-green-400 opacity-80" />
              <span style={{fontFamily:"'Space Grotesk','Space Grotesk Fallback',sans-serif", fontSize:"9px", fontWeight:700, letterSpacing:"0.12em", color:"#86efac", textTransform:"uppercase"}}>Live</span>
            </div>
          )}
        </div>
        <p style={{
          fontFamily:"'Inter',sans-serif",
          fontSize:"13px",
          fontWeight:400,
          color:"rgba(255,255,255,0.38)",
          letterSpacing:"0.01em",
        }}>Based on Bangladesh Standard Time</p>
      </div>

      {/* Page range label */}
      <div className="mb-3 flex items-center justify-between">
        <div />
        <div style={{fontFamily:"'Inter',sans-serif", fontSize:"11px", color:"rgba(255,255,255,0.3)", fontWeight:500}}>
          <span>{fmtD(pageStart)}</span>
          {pageStart !== pageEnd && <><span className="mx-1" style={{color:"rgba(255,255,255,0.15)"}}>–</span><span>{fmtD(pageEnd)}</span></>}
        </div>
      </div>

      {/* Navigation + content */}
      <div className="flex items-stretch gap-2 sm:gap-3">
        {/* Prev */}
        <button onClick={() => navigate(-1)} disabled={page === 0}
          className="group flex w-9 shrink-0 flex-col items-center justify-center rounded-xl transition-all duration-200 active:scale-95"
          style={{
            background: page === 0 ? "rgba(255,255,255,0.02)" : "rgba(139,92,246,0.12)",
            border: "none",
            opacity: page === 0 ? 0.3 : 1,
          }}>
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={page===0?"rgba(255,255,255,0.3)":"rgba(167,139,250,0.9)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </span>
        </button>

        {/* Days grid */}
        <div ref={containerRef} className="min-w-0 flex-1 overflow-hidden">
          <div key={animKey} className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${current.length},1fr)`,
              animation: `slideIn${dir > 0 ? "Right" : "Left"} 320ms cubic-bezier(.4,0,.2,1)`,
              willChange: "transform, opacity",
            }}>
            {current.map(dayGroup => (
              <DayColumn key={dayGroup.date} dayGroup={dayGroup} todayBD={todayBD} />
            ))}
          </div>
        </div>

        {/* Next */}
        <button onClick={() => navigate(1)} disabled={page >= pages.length - 1}
          className="group flex w-9 shrink-0 flex-col items-center justify-center rounded-xl transition-all duration-200 active:scale-95"
          style={{
            background: page >= pages.length-1 ? "rgba(255,255,255,0.02)" : "rgba(139,92,246,0.12)",
            border: "none",
            opacity: page >= pages.length-1 ? 0.3 : 1,
          }}>
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={page>=pages.length-1?"rgba(255,255,255,0.3)":"rgba(167,139,250,0.9)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
        </button>
      </div>

      {/* Page dots — hidden on mobile */}
      <div className="mt-4 hidden items-center justify-center gap-1.5 sm:flex">
        {pages.map((_, i) => (
          <button key={i} onClick={() => { setDir(i > page ? 1 : -1); setAnimKey(k=>k+1); setPage(i); }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === page ? "20px" : "6px",
              height: "6px",
              background: i === page ? "rgba(139,92,246,0.8)" : "rgba(255,255,255,0.15)",
              boxShadow: i === page ? "0 0 8px rgba(139,92,246,0.5)" : "none",
              border: "none",
            }} />
        ))}
      </div>

      <p className="mt-4 text-center" style={{fontFamily:"'Inter',sans-serif", fontSize:"10px", color:"rgba(255,255,255,0.18)", fontWeight:400}}>
        Based on Bangladesh Standard Time
      </p>

      {/* Credits — moved here, centered under the schedule note */}
      <FooterCredits />

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
