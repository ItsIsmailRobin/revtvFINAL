export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#070410]">
      <div className="absolute inset-0 bg-[#070410]" />

      {/* Vivid purple/violet orbs — brighter, more saturated than before */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 60% at 8% 12%, rgba(159,92,255,0.50) 0%, rgba(139,72,246,0.22) 40%, transparent 68%)," +
            "radial-gradient(ellipse 65% 55% at 90% 10%, rgba(144,58,255,0.44) 0%, rgba(124,38,237,0.18) 40%, transparent 65%)," +
            "radial-gradient(ellipse 70% 60% at 12% 88%, rgba(187,139,255,0.42) 0%, rgba(167,119,250,0.18) 40%, transparent 65%)," +
            "radial-gradient(ellipse 65% 55% at 88% 90%, rgba(109,82,241,0.40) 0%, rgba(99,62,221,0.16) 40%, transparent 65%)," +
            "radial-gradient(ellipse 55% 50% at 50% 48%, rgba(159,92,255,0.22) 0%, rgba(130,60,240,0.10) 50%, transparent 75%)",
        }}
      />

      {/* Mid-screen accent bands — adds depth and vibrancy */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 30% at 50% 0%, rgba(139,92,246,0.18) 0%, transparent 70%)," +
            "radial-gradient(ellipse 90% 25% at 50% 100%, rgba(120,60,255,0.14) 0%, transparent 70%)",
        }}
      />

      {/* Vignette to keep center readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(5,2,12,0.48) 100%)",
        }}
      />

      {/* Static petals — soft, no GPU layers */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {STATIC_PETALS.map((p) => (
          <span
            key={p.id}
            className="absolute select-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: `${p.size}px`,
              opacity: p.opacity,
              animation: `petalDrift ${p.duration}s linear ${p.delay}s infinite`,
            }}
          >
            🌸
          </span>
        ))}
      </div>

      <style>{`
        @keyframes petalDrift {
          0%   { transform: translateY(0px)   rotate(0deg);   }
          50%  { transform: translateY(-20px) rotate(180deg); }
          100% { transform: translateY(0px)   rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const STATIC_PETALS = [
  { id: 1,  x: 4,  y: 8,  size: 17, opacity: 0.28, duration: 18, delay: 0   },
  { id: 2,  x: 19, y: 53, size: 14, opacity: 0.22, duration: 22, delay: -6  },
  { id: 3,  x: 37, y: 18, size: 19, opacity: 0.25, duration: 20, delay: -3  },
  { id: 4,  x: 54, y: 76, size: 15, opacity: 0.20, duration: 25, delay: -9  },
  { id: 5,  x: 71, y: 33, size: 18, opacity: 0.24, duration: 19, delay: -12 },
  { id: 6,  x: 83, y: 64, size: 14, opacity: 0.19, duration: 23, delay: -4  },
  { id: 7,  x: 93, y: 13, size: 17, opacity: 0.22, duration: 21, delay: -15 },
  { id: 8,  x: 44, y: 89, size: 16, opacity: 0.20, duration: 24, delay: -8  },
  { id: 9,  x: 62, y: 5,  size: 13, opacity: 0.18, duration: 26, delay: -11 },
  { id: 10, x: 28, y: 42, size: 15, opacity: 0.17, duration: 27, delay: -17 },
];
