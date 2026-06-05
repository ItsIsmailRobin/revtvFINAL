import { useEffect, useState } from "react";

interface Petal {
  id: number;
  startX: number;
  startY: number;
  size: number; // 14-22px
  baseOpacity: number; // 0.3-0.65
  duration: number; // 450-750s (0.07x speed)
  delay: number;
  travel: "tl-br" | "tr-bl" | "bl-tr" | "br-tl";
}

function makePetal(id: number): Petal {
  const travels: Petal["travel"][] = ["tl-br", "tr-bl", "bl-tr", "br-tl"];
  return {
    id,
    startX: 1 + Math.random() * 98,
    startY: 1 + Math.random() * 98,
    size: 14 + Math.random() * 8, // 14-22px
    baseOpacity: 0.3 + Math.random() * 0.35, // 30-65%
    duration: 450 + Math.random() * 300, // 0.07x: 7.5-12.5 min
    delay: -Math.random() * 300,
    travel: travels[Math.floor(Math.random() * travels.length)],
  };
}

export default function Background() {
  const [petals, setPetals] = useState<Petal[]>([]);

  // Spawn loop: keep 25-30 flowers active on screen at all times.
  useEffect(() => {
    const initial = Array.from({ length: 28 }, (_, i) => makePetal(i + 1));
    setPetals(initial);

    const interval = setInterval(() => {
      setPetals((prev) => {
        const count = prev.length;
        if (count >= 30) return prev.slice(1);
        if (count < 25) {
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
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#06050d]">
      {/* Base dark wash */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,12,38,1)_0%,rgba(6,5,13,1)_72%)]" />

      {/* Primary purple wash */}
      <div
        className="absolute inset-[-35%] opacity-95"
        style={{
          background:
            "radial-gradient(42% 36% at 18% 22%, rgba(139,92,246,0.42) 0%, rgba(139,92,246,0.18) 32%, rgba(139,92,246,0.06) 56%, transparent 78%), radial-gradient(38% 32% at 80% 20%, rgba(124,58,237,0.36) 0%, rgba(124,58,237,0.14) 32%, rgba(124,58,237,0.05) 56%, transparent 78%), radial-gradient(44% 36% at 22% 78%, rgba(167,139,250,0.34) 0%, rgba(167,139,250,0.13) 32%, rgba(167,139,250,0.04) 56%, transparent 78%), radial-gradient(40% 34% at 78% 80%, rgba(99,102,241,0.30) 0%, rgba(99,102,241,0.11) 32%, rgba(99,102,241,0.04) 56%, transparent 78%)",
          filter: "blur(200px)",
          mixBlendMode: "screen",
          animation: "bgDriftA 600s linear infinite",
          willChange: "transform",
        }}
      />

      {/* Secondary ambient purple glow */}
      <div
        className="absolute inset-[-35%] opacity-80"
        style={{
          background:
            "radial-gradient(32% 28% at 30% 30%, rgba(139,92,246,0.32) 0%, rgba(139,92,246,0.10) 40%, transparent 76%), radial-gradient(30% 28% at 72% 34%, rgba(167,139,250,0.26) 0%, rgba(167,139,250,0.08) 40%, transparent 76%), radial-gradient(34% 32% at 56% 70%, rgba(124,58,237,0.26) 0%, rgba(124,58,237,0.08) 40%, transparent 78%)",
          filter: "blur(220px)",
          mixBlendMode: "screen",
          animation: "bgDriftB 750s linear infinite reverse",
          willChange: "transform",
        }}
      />

      {/* Subtle conic accent */}
      <div
        className="absolute inset-[-20%] opacity-55"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, rgba(139,92,246,0.10), rgba(167,139,250,0.08), rgba(124,58,237,0.10), rgba(99,102,241,0.07), rgba(139,92,246,0.10))",
          filter: "blur(240px)",
          mixBlendMode: "screen",
          animation: "bgRotate 900s linear infinite",
          willChange: "transform",
        }}
      />

      {/* Vignette + shading + grain */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 30%, rgba(6,5,13,0.22) 80%, rgba(6,5,13,0.50) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.012) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.06) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Flowers - 25-30 active. Pure floating logic, no mouse interaction.
          Long cross-viewport travel (0.07x speed).
          Fade in/out 15s at the edges. */}
      <div
        className="absolute inset-0"
        style={{
          maskImage:
            "radial-gradient(ellipse 82% 76% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 50%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 82% 76% at 50% 50%, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 50%, rgba(0,0,0,0.2) 80%, rgba(0,0,0,0) 100%)",
        }}
      >
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
                animation: `petalTravel${p.travel.replace(
                  "-",
                  ""
                )} ${p.duration}s linear ${p.delay}s infinite, petalFade ${p.duration}s linear ${p.delay}s infinite`,
                willChange: "transform, opacity",
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
          0%   { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes bgDriftB {
          0%   { transform: translate3d(0,0,0) rotate(0deg) scale(1.03); }
          50%  { transform: translate3d(2%, -2%, 0) rotate(180deg) scale(1.06); }
          100% { transform: translate3d(0,0,0) rotate(360deg) scale(1.03); }
        }
        @keyframes bgRotate {
          0%   { transform: rotate(0deg) scale(1.02); }
          100% { transform: rotate(360deg) scale(1.02); }
        }

        /* Cross-viewport travel — only the transform. */
        @keyframes petalTraveltlbr {
          0%   { transform: translate(-50vw, -50vh) rotate(0deg); }
          100% { transform: translate(150vw, 150vh) rotate(720deg); }
        }
        @keyframes petalTraveltrbl {
          0%   { transform: translate(150vw, -50vh) rotate(0deg); }
          100% { transform: translate(-50vw, 150vh) rotate(-720deg); }
        }
        @keyframes petalTravelbltr {
          0%   { transform: translate(-50vw, 150vh) rotate(0deg); }
          100% { transform: translate(150vw, -50vh) rotate(720deg); }
        }
        @keyframes petalTravelbrtl {
          0%   { transform: translate(150vw, 150vh) rotate(0deg); }
          100% { transform: translate(-50vw, -50vh) rotate(-720deg); }
        }

        /* Opacity fade: 15s in, 15s out. For a 600s travel: 2.5% = 15s. */
        @keyframes petalFade {
          0%      { opacity: 0; }
          2.5%    { opacity: var(--maxO, 0.5); }
          97.5%   { opacity: var(--maxO, 0.5); }
          100%    { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
