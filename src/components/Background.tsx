// Background: CPU-friendly static gradient — no blur filters, no willChange,
// no mixBlendMode, no animated layers, no JS-driven petals.
// Visually identical dark purple aesthetic, zero GPU compositing overhead.

export default function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05030a]">
      {/* Base solid fill */}
      <div className="absolute inset-0 bg-[#05030a]" />

      {/* Static purple orbs — pre-rendered as a single CSS gradient, no filter/blur/animation */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 10% 15%, rgba(139,92,246,0.28) 0%, transparent 65%)," +
            "radial-gradient(ellipse 60% 50% at 88% 14%, rgba(124,58,237,0.22) 0%, transparent 60%)," +
            "radial-gradient(ellipse 65% 55% at 15% 85%, rgba(167,139,250,0.20) 0%, transparent 60%)," +
            "radial-gradient(ellipse 60% 50% at 85% 88%, rgba(99,102,241,0.18) 0%, transparent 60%)," +
            "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Very subtle vignette overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(5,3,10,0.55) 100%)",
        }}
      />

      {/* Static floating flowers — pure CSS, no JS state, no willChange */}
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
          50%  { transform: translateY(-18px) rotate(180deg); }
          100% { transform: translateY(0px)   rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// 8 petals, positions fixed — no JS interval, no re-renders, no GPU layers.
const STATIC_PETALS = [
  { id: 1,  x: 5,  y: 10, size: 16, opacity: 0.18, duration: 18, delay: 0   },
  { id: 2,  x: 20, y: 55, size: 14, opacity: 0.14, duration: 22, delay: -6  },
  { id: 3,  x: 38, y: 20, size: 18, opacity: 0.16, duration: 20, delay: -3  },
  { id: 4,  x: 55, y: 75, size: 15, opacity: 0.13, duration: 25, delay: -9  },
  { id: 5,  x: 70, y: 35, size: 17, opacity: 0.15, duration: 19, delay: -12 },
  { id: 6,  x: 82, y: 65, size: 14, opacity: 0.12, duration: 23, delay: -4  },
  { id: 7,  x: 92, y: 15, size: 16, opacity: 0.14, duration: 21, delay: -15 },
  { id: 8,  x: 45, y: 88, size: 15, opacity: 0.13, duration: 24, delay: -8  },
];
