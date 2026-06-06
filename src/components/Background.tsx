import { useEffect, useState } from "react";

interface Petal {
  id: number;
  // Entry position is always OFF-SCREEN on one of the 4 edges.
  // startX is -10..10 or 90..110 so the flower spawns just outside the
  // webview and travels across to the opposite edge.
  startX: number;
  startY: number;
  size: number; // 14-22px
  baseOpacity: number; // 0.3-0.65
  duration: number; // 60-110s
  delay: number;
  // Travel direction across the webview. Each flower gets a random
  // direction so the floatings look natural and varied.
  travel: "ltr" | "rtl" | "ttb" | "btt" | "tlbr" | "trbl" | "bltr" | "brtl";
}

function makePetal(id: number): Petal {
  // 8 random travel directions (more variation than just corners):
  //  - ltr / rtl : left → right, right → left (horizontal)
  //  - ttb / btt : top → bottom, bottom → top (vertical)
  //  - tlbr / trbl / bltr / brtl : 4 diagonal corner paths
  const travels: Petal["travel"][] = [
    "ltr",
    "rtl",
    "ttb",
    "btt",
    "tlbr",
    "trbl",
    "bltr",
    "brtl",
  ];
  const travel = travels[Math.floor(Math.random() * travels.length)];

  // Entry position: at the relevant edge, OUTSIDE the webview.
  // The flower mounts here (off-screen, opacity 0), then travels
  // across and vanishes at the opposite edge (off-screen, opacity 0).
  let startX: number;
  let startY: number;

  switch (travel) {
    case "ltr":
      // left edge → right edge (horizontal sweep)
      startX = -10 - Math.random() * 8; // -10 to -18
      startY = 5 + Math.random() * 90;
      break;
    case "rtl":
      // right edge → left edge
      startX = 110 + Math.random() * 8; // 110 to 118
      startY = 5 + Math.random() * 90;
      break;
    case "ttb":
      // top edge → bottom edge (vertical sweep)
      startX = 5 + Math.random() * 90;
      startY = -10 - Math.random() * 8;
      break;
    case "btt":
      // bottom edge → top edge
      startX = 5 + Math.random() * 90;
      startY = 110 + Math.random() * 8;
      break;
    case "tlbr":
      // top-left corner → bottom-right corner (diagonal)
      startX = -10 - Math.random() * 8;
      startY = -10 - Math.random() * 8;
      break;
    case "trbl":
      // top-right corner → bottom-left corner
      startX = 110 + Math.random() * 8;
      startY = -10 - Math.random() * 8;
      break;
    case "bltr":
      // bottom-left corner → top-right corner
      startX = -10 - Math.random() * 8;
      startY = 110 + Math.random() * 8;
      break;
    case "brtl":
    default:
      // bottom-right corner → top-left corner
      startX = 110 + Math.random() * 8;
      startY = 110 + Math.random() * 8;
      break;
  }

  return {
    id,
    startX,
    startY,
    size: 14 + Math.random() * 8, // 14-22px
    baseOpacity: 0.3 + Math.random() * 0.35, // 30-65%
    // 60-110s — slow but visible. Each flower has a unique duration
    // so the population doesn't pulse in sync.
    duration: 60 + Math.random() * 50,
    // Stagger start within the cycle so flowers are spread across
    // the timeline, not bunched at t=0.
    delay: -Math.random() * 110,
    travel,
  };
}

export default function Background() {
  const [petals, setPetals] = useState<Petal[]>([]);

  // 10-15 flowers active at the same time. Lower count = butter-smooth
  // performance (fewer simultaneous GPU animations).
  useEffect(() => {
    const initial = Array.from({ length: 12 }, (_, i) => makePetal(i + 1));
    setPetals(initial);

    const interval = setInterval(() => {
      setPetals((prev) => {
        const count = prev.length;
        if (count >= 15) return prev.slice(1);
        if (count < 10) {
          const newId = Math.max(0, ...prev.map((p) => p.id)) + 1;
          return [...prev, makePetal(newId)];
        }
        if (Math.random() > 0.45) {
          const newId = Math.max(0, ...prev.map((p) => p.id)) + 1;
          return [...prev, makePetal(newId)];
        } else {
          return prev.slice(1);
        }
      });
    }, 2000); // slower spawn so we don't churn through the population

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05030a]">
      {/* Base dark — solid color, fills the entire viewport, no gaps. */}
      <div className="absolute inset-0 bg-[#05030a]" />

      {/* Primary purple wash — large blur, slow drift, full-viewport.
          inset-[-50%] so the orbs extend WELL beyond the viewport edges. */}
      <div
        className="absolute inset-[-50%] opacity-100"
        style={{
          background:
            "radial-gradient(50% 42% at 12% 18%, rgba(139,92,246,0.65) 0%, rgba(139,92,246,0.30) 28%, rgba(139,92,246,0.10) 52%, transparent 78%), radial-gradient(45% 38% at 85% 16%, rgba(124,58,237,0.58) 0%, rgba(124,58,237,0.25) 28%, rgba(124,58,237,0.08) 52%, transparent 78%), radial-gradient(52% 42% at 18% 82%, rgba(167,139,250,0.55) 0%, rgba(167,139,250,0.22) 28%, rgba(167,139,250,0.08) 52%, transparent 80%), radial-gradient(48% 40% at 82% 84%, rgba(99,102,241,0.50) 0%, rgba(99,102,241,0.20) 28%, rgba(99,102,241,0.07) 52%, transparent 78%)",
          filter: "blur(160px)",
          mixBlendMode: "screen",
          animation: "bgDriftA 900s linear infinite",
          willChange: "transform",
          transform: "translate3d(0, 0, 0)",
        }}
      />

      {/* Secondary ambient purple glow — complementary motion */}
      <div
        className="absolute inset-[-50%] opacity-85"
        style={{
          background:
            "radial-gradient(38% 34% at 28% 26%, rgba(139,92,246,0.40) 0%, rgba(139,92,246,0.14) 40%, transparent 76%), radial-gradient(36% 32% at 74% 30%, rgba(167,139,250,0.34) 0%, rgba(167,139,250,0.12) 40%, transparent 76%), radial-gradient(40% 36% at 56% 72%, rgba(124,58,237,0.34) 0%, rgba(124,58,237,0.12) 40%, transparent 78%)",
          filter: "blur(160px)",
          mixBlendMode: "screen",
          animation: "bgDriftB 1100s linear infinite reverse",
          willChange: "transform",
          transform: "translate3d(0, 0, 0)",
        }}
      />

      {/* Subtle conic accent — very soft, slow rotation */}
      <div
        className="absolute inset-[-20%] opacity-50"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, rgba(139,92,246,0.10), rgba(167,139,250,0.08), rgba(124,58,237,0.10), rgba(99,102,241,0.07), rgba(139,92,246,0.10))",
          filter: "blur(160px)",
          mixBlendMode: "screen",
          animation: "bgRotate 1300s linear infinite",
          willChange: "transform",
          transform: "translate3d(0, 0, 0)",
        }}
      />

      {/* Soft glowing pulse layer */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(139,92,246,0.10) 0%, rgba(124,58,237,0.05) 40%, transparent 70%)",
          mixBlendMode: "screen",
          animation: "bgPulse 20s ease-in-out infinite",
          willChange: "opacity",
        }}
      />

      {/* Darker overlay — darkens the background by 30% while keeping
          the purple orbs visible. Sits on top of all the animated orbs. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(8,4,16,0.35) 0%, rgba(5,3,10,0.45) 60%, rgba(5,3,10,0.60) 100%)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
        }}
      />

      {/* Glass-blur top sheen — gives the page a subtle frosted-glass
          reflection at the top, like a polished surface. */}
      <div
        className="absolute inset-x-0 top-0 h-1/2"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* Flowers — 10-15 active. Pure floating logic.
          Each flower spawns OUTSIDE the webview (negative or >100% position),
          travels across the webview with a random direction, and
          vanishes OUTSIDE the webview on the opposite side.
          The fade happens only at the very edges — never in the middle. */}
      <div className="absolute inset-0 overflow-hidden">
        {petals.map((p) => (
          <div
            key={p.id}
            className="absolute select-none"
            style={
              {
                left: `${p.startX}%`,
                top: `${p.startY}%`,
                fontSize: `${p.size}px`,
                filter: "blur(0.3px) drop-shadow(0 0 5px rgba(236,72,153,0.22))",
                animation: `petalTravel${p.travel} ${p.duration}s linear ${p.delay}s infinite, petalFade ${p.duration}s linear ${p.delay}s infinite`,
                willChange: "transform, opacity",
                // Force GPU layer creation for butter-smooth animation
                transform: "translate3d(0, 0, 0)",
                backfaceVisibility: "hidden",
                ["--maxO" as any]: p.baseOpacity,
              } as React.CSSProperties
            }
          >
            🌸
          </div>
        ))}
      </div>

      <style>{`
        @keyframes bgDriftA {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); }
          50%  { transform: translate3d(0, 0, 0) rotate(180deg) scale(1.04); }
          100% { transform: translate3d(0, 0, 0) rotate(360deg) scale(1); }
        }
        @keyframes bgDriftB {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1.03); }
          50%  { transform: translate3d(0, 0, 0) rotate(180deg) scale(1.05); }
          100% { transform: translate3d(0, 0, 0) rotate(360deg) scale(1.03); }
        }
        @keyframes bgRotate {
          0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1.02); }
          100% { transform: translate3d(0, 0, 0) rotate(360deg) scale(1.02); }
        }
        @keyframes bgPulse {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1.0; }
        }

        /* 8 travel paths — start outside the webview, end outside.
           All paths use GPU-accelerated translate3d.
           The flower spawns at the start (off-screen) and vanishes
           at the end (off-screen) — the opacity keyframe handles the
           fade only at the very edges. */
        @keyframes petalTravelltr {
          0%   { transform: translate3d(0vw, 0vh, 0) rotate(0deg); }
          100% { transform: translate3d(130vw, 0vh, 0) rotate(360deg); }
        }
        @keyframes petalTravelrtl {
          0%   { transform: translate3d(0vw, 0vh, 0) rotate(0deg); }
          100% { transform: translate3d(-130vw, 0vh, 0) rotate(-360deg); }
        }
        @keyframes petalTravelttb {
          0%   { transform: translate3d(0vw, 0vh, 0) rotate(0deg); }
          100% { transform: translate3d(0vw, 130vh, 0) rotate(360deg); }
        }
        @keyframes petalTravelbtt {
          0%   { transform: translate3d(0vw, 0vh, 0) rotate(0deg); }
          100% { transform: translate3d(0vw, -130vh, 0) rotate(-360deg); }
        }
        @keyframes petalTraveltlbr {
          0%   { transform: translate3d(0vw, 0vh, 0) rotate(0deg); }
          100% { transform: translate3d(130vw, 130vh, 0) rotate(720deg); }
        }
        @keyframes petalTraveltrbl {
          0%   { transform: translate3d(0vw, 0vh, 0) rotate(0deg); }
          100% { transform: translate3d(-130vw, 130vh, 0) rotate(-720deg); }
        }
        @keyframes petalTravelbltr {
          0%   { transform: translate3d(0vw, 0vh, 0) rotate(0deg); }
          100% { transform: translate3d(130vw, -130vh, 0) rotate(720deg); }
        }
        @keyframes petalTravelbrtl {
          0%   { transform: translate3d(0vw, 0vh, 0) rotate(0deg); }
          100% { transform: translate3d(-130vw, -130vh, 0) rotate(-720deg); }
        }

        /* Opacity fade — happens only at the start and end of the
           travel. The keyframe uses a SHARP step at the start/end so
           the fade is concentrated on the edges (when the flower is
           off-screen) and the middle of the travel is at FULL opacity
           with no fade. For a 100s travel, 0% and 100% are off-screen
           (opacity 0), 1% to 99% is the full visible duration. */
        @keyframes petalFade {
          0%      { opacity: 0; }
          1%      { opacity: var(--maxO, 0.5); }
          99%     { opacity: var(--maxO, 0.5); }
          100%    { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
