export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" style={{ background: "#0a0220" }}>

      {/* Full-coverage deep purple base — rich, no black bleed */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(160deg,#100425 0%,#0a021f 30%,#0c0322 60%,#0a0220 100%)"
      }} />

      {/* Large corner orbs — vivid, saturated, positioned to fill all corners */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(ellipse 85% 70% at -8% 2%,  rgba(168,75,255,0.72) 0%, rgba(140,50,240,0.32) 38%, transparent 68%)," +
          "radial-gradient(ellipse 75% 65% at 110% 5%,  rgba(130,45,255,0.65) 0%, rgba(110,25,230,0.28) 38%, transparent 66%)," +
          "radial-gradient(ellipse 80% 70% at -10% 102%,rgba(195,90,255,0.62) 0%, rgba(162,65,252,0.26) 38%, transparent 66%)," +
          "radial-gradient(ellipse 75% 65% at 110% 98%, rgba(115,55,255,0.58) 0%, rgba(92,38,232,0.22) 38%, transparent 66%)," +
          "radial-gradient(ellipse 60% 55% at 50% 50%,  rgba(145,65,255,0.28) 0%, transparent 68%)",
      }} />

      {/* Mid-field diagonal accents */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(ellipse 65% 32% at 76% 26%, rgba(185,85,255,0.36) 0%, transparent 62%)," +
          "radial-gradient(ellipse 58% 30% at 24% 74%, rgba(122,48,255,0.32) 0%, transparent 60%)," +
          "radial-gradient(ellipse 42% 22% at 62% 88%, rgba(205,95,255,0.24) 0%, transparent 52%)",
      }} />

      {/* Centre blend fill — softens the gaps between the corner orbs so
          there are no flat dark/black patches in the middle of the screen */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(ellipse 90% 85% at 50% 50%, rgba(120,55,235,0.22) 0%, rgba(90,40,200,0.10) 45%, transparent 78%)",
      }} />

      {/* Micro-glow texture dots */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(circle 200px at 18% 38%,  rgba(165,78,255,0.22) 0%, transparent 100%)," +
          "radial-gradient(circle 165px at 82% 55%,  rgba(132,58,255,0.20) 0%, transparent 100%)," +
          "radial-gradient(circle 130px at 45% 22%,  rgba(205,115,255,0.18) 0%, transparent 100%)," +
          "radial-gradient(circle 148px at 70% 80%,  rgba(112,48,255,0.19) 0%, transparent 100%)," +
          "radial-gradient(circle 100px at 30% 60%,  rgba(180,80,255,0.14) 0%, transparent 100%)",
      }} />

      {/* Very subtle dark vignette — softened so edges blend smoothly
          instead of dropping to flat black corners */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 130% 130% at 50% 50%, transparent 55%, rgba(6,2,14,0.35) 100%)",
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
