import { useMemo } from "react";

// Deterministic-random helper seeded by page load so each refresh looks different
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export default function Background() {
  // New seed every render (page load / hard refresh) so blobs move around
  const blobs = useMemo(() => {
    const r = seededRand(Date.now() & 0xffff);

    // Generate 5 random blobs — all pure purple/violet, zero pink/red hue
    // x restricted to 10–90% to avoid heavy left or right edge bias
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: 10 + r() * 80,          // 10% – 90%
      y: r() * 100,
      rx: 50 + r() * 40,          // 50% – 90% ellipse radius x
      ry: 40 + r() * 35,          // 40% – 75% ellipse radius y
      // Hue strictly 255–280 (purple, not pink/red)
      h: 255 + Math.floor(r() * 25),
      s: 70 + Math.floor(r() * 20),
      l: 35 + Math.floor(r() * 20),
      a: 0.45 + r() * 0.30,
    }));
  }, []);

  const midBlobs = useMemo(() => {
    const r = seededRand((Date.now() & 0xffff) ^ 0xabcd);
    return Array.from({ length: 3 }, (_, i) => ({
      id: i,
      x: 15 + r() * 70,
      y: 20 + r() * 60,
      rx: 35 + r() * 30,
      ry: 25 + r() * 25,
      h: 258 + Math.floor(r() * 20),
      a: 0.22 + r() * 0.18,
    }));
  }, []);

  const blobGrad = blobs
    .map(b => `radial-gradient(ellipse ${b.rx}% ${b.ry}% at ${b.x}% ${b.y}%, hsla(${b.h},${b.s}%,${b.l}%,${b.a.toFixed(2)}) 0%, hsla(${b.h},${b.s}%,${b.l-8}%,${(b.a*0.35).toFixed(2)}) 42%, transparent 70%)`)
    .join(",");

  const midGrad = midBlobs
    .map(b => `radial-gradient(ellipse ${b.rx}% ${b.ry}% at ${b.x}% ${b.y}%, hsla(${b.h},72%,42%,${b.a.toFixed(2)}) 0%, transparent 65%)`)
    .join(",");

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: "#0a0220" }}>

      {/* Deep purple base */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(160deg,#0f0428 0%,#0a021f 30%,#0c0322 60%,#0a0220 100%)"
      }} />

      {/* Randomised main blobs — pure purple/violet hues only */}
      <div className="absolute inset-0" style={{ background: blobGrad }} />

      {/* Randomised mid-field accents */}
      <div className="absolute inset-0" style={{ background: midGrad }} />

      {/* Centre fill — softens gaps so no flat black patches */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 90% 85% at 50% 50%, rgba(110,50,220,0.18) 0%, rgba(80,35,190,0.08) 50%, transparent 80%)"
      }} />

      {/* Very subtle dark vignette */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 130% 130% at 50% 50%, transparent 55%, rgba(6,2,14,0.38) 100%)"
      }} />

      {/* Static petals — zero GPU layers, phase-locked to wall-clock time
          so every viewer (and every refresh) sees petals floating in
          the exact same position at the exact same moment.
          Hidden on touch/mobile devices: 12 infinitely-running CSS
          animations across the full viewport add up to constant
          compositor work that, combined with video decoding, was a
          notable contributor to phones running hot. Desktop is
          unaffected — petals still render there exactly as before. */}
      <div className="absolute inset-0 overflow-hidden petals-layer" aria-hidden>
        {PETALS.map(p => {
          // Anchor the animation's phase to absolute time (epoch seconds)
          // rather than page-load time. A negative delay equal to
          // (now mod duration) makes the animation appear to have been
          // running continuously since the epoch — identical everywhere.
          const nowSec = Date.now() / 1000;
          const phase = ((nowSec + p.delay) % p.dur + p.dur) % p.dur;
          return (
            <span key={p.id} className="absolute select-none" style={{
              left: `${p.x}%`, top: `${p.y}%`,
              fontSize: `${p.size}px`, opacity: p.opacity,
              animation: `petalDrift ${p.dur}s linear ${-phase}s infinite`,
            }}>🌸</span>
          );
        })}
      </div>

      <style>{`
        @keyframes petalDrift {
          0%   { transform: translateY(0px)   rotate(0deg);   }
          50%  { transform: translateY(-22px) rotate(180deg); }
          100% { transform: translateY(0px)   rotate(360deg); }
        }
        /* Disable the petal layer on touch/coarse-pointer devices
           (phones & tablets) to cut continuous animation overhead.
           Desktop (fine pointer / hover-capable) keeps petals as-is. */
        @media (hover: none), (pointer: coarse) {
          .petals-layer { display: none; }
        }
      `}</style>
    </div>
  );
}

const PETALS = [
  { id:1,  x:3,  y:7,  size:16, opacity:0.30, dur:18, delay:0   },
  { id:2,  x:18, y:52, size:13, opacity:0.22, dur:22, delay:-6  },
  { id:3,  x:36, y:17, size:18, opacity:0.28, dur:20, delay:-3  },
  { id:4,  x:53, y:77, size:14, opacity:0.22, dur:25, delay:-9  },
  { id:5,  x:72, y:32, size:17, opacity:0.26, dur:19, delay:-12 },
  { id:6,  x:84, y:63, size:13, opacity:0.20, dur:23, delay:-4  },
  { id:7,  x:94, y:12, size:16, opacity:0.24, dur:21, delay:-15 },
  { id:8,  x:43, y:90, size:15, opacity:0.22, dur:24, delay:-8  },
  { id:9,  x:61, y:4,  size:12, opacity:0.19, dur:26, delay:-11 },
  { id:10, x:27, y:41, size:14, opacity:0.18, dur:27, delay:-17 },
  { id:11, x:8,  y:80, size:12, opacity:0.16, dur:29, delay:-20 },
  { id:12, x:90, y:45, size:15, opacity:0.20, dur:28, delay:-7  },
];
