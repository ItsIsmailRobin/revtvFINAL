export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: "#030108" }}>

      {/* Full-coverage deep purple base — eliminates any white/grey areas */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#0d0520 0%,#060112 35%,#09021a 65%,#05010f 100%)" }} />

      {/* Large asymmetric orbs — vivid, saturated, scattered to all corners */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(ellipse 80% 65% at -5% 5%,  rgba(168,85,255,0.65) 0%, rgba(140,60,240,0.28) 40%, transparent 70%)," +
          "radial-gradient(ellipse 70% 60% at 108% 8%,  rgba(130,50,255,0.58) 0%, rgba(110,30,230,0.22) 40%, transparent 68%)," +
          "radial-gradient(ellipse 75% 65% at -8% 100%, rgba(190,100,255,0.55) 0%, rgba(160,70,250,0.20) 40%, transparent 68%)," +
          "radial-gradient(ellipse 70% 60% at 108% 96%, rgba(110,60,255,0.52) 0%, rgba( 90,40,230,0.18) 40%, transparent 68%)," +
          "radial-gradient(ellipse 55% 50% at 50% 50%,  rgba(140,70,255,0.22) 0%, transparent 70%)",
      }} />

      {/* Mid-field accent — diagonal smear for randomness */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(ellipse 60% 30% at 75% 28%, rgba(180,90,255,0.30) 0%, transparent 65%)," +
          "radial-gradient(ellipse 55% 28% at 25% 72%, rgba(120,50,255,0.28) 0%, transparent 62%)," +
          "radial-gradient(ellipse 40% 20% at 60% 85%, rgba(200,100,255,0.20) 0%, transparent 55%)",
      }} />

      {/* Subtle noise-like micro-glow dots for texture */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(circle 180px at 18% 38%,  rgba(160,80,255,0.18) 0%, transparent 100%)," +
          "radial-gradient(circle 150px at 82% 55%,  rgba(130,60,255,0.16) 0%, transparent 100%)," +
          "radial-gradient(circle 120px at 45% 22%,  rgba(200,120,255,0.14) 0%, transparent 100%)," +
          "radial-gradient(circle 140px at 70% 80%,  rgba(110,50,255,0.15) 0%, transparent 100%)",
      }} />

      {/* Subtle CSS blur overlay — adds depth without GPU compositing layers */}
      <div className="absolute inset-0" style={{
        background: "rgba(8,2,20,0.18)",
        backdropFilter: "blur(0px)", // intentionally 0 — piggyback the layer for future
      }} />

      {/* Static petals — zero GPU layers */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {PETALS.map(p => (
          <span key={p.id} className="absolute select-none" style={{
            left: `${p.x}%`, top: `${p.y}%`,
            fontSize: `${p.size}px`, opacity: p.opacity,
            animation: `petalDrift ${p.dur}s linear ${p.delay}s infinite`,
          }}>🌸</span>
        ))}
      </div>

      <style>{`
        @keyframes petalDrift {
          0%   { transform: translateY(0px)   rotate(0deg);   }
          50%  { transform: translateY(-22px) rotate(180deg); }
          100% { transform: translateY(0px)   rotate(360deg); }
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
