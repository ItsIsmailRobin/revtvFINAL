import { useEffect, useRef, useState } from "react";
import { cn } from "../utils/cn";

interface TagBarProps {
  tags: string[];
  activeTag: string;
  onChange: (tag: string) => void;
  hideArrows?: boolean;
}

export default function TagBar({
  tags,
  activeTag,
  onChange,
  hideArrows = false,
}: TagBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const canScroll = tags.length > 1;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [tags.length]);

  const scroll = (dir: 1 | -1) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: dir * Math.max(200, scrollRef.current.clientWidth * 0.7),
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center py-2">
        {/* < arrow slot - hidden when hideArrows is true (dropdown open) */}
        {!hideArrows && (
        <div className="relative flex shrink-0 items-center justify-center pl-2 pr-2">
          <button
            onClick={() => canLeft && scroll(-1)}
            aria-label="Previous tags"
            className={cn(
              "group flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 backdrop-blur-2xl transition-all duration-300 active:scale-90",
              canScroll
                ? canLeft
                  ? "opacity-100 hover:scale-110 hover:bg-white/[0.08] hover:text-white cursor-pointer"
                  : "opacity-25 cursor-not-allowed"
                : "opacity-20 cursor-not-allowed"
            )}
            style={{ boxShadow: "none" }}
          >
            <span
              className="pointer-events-none absolute -inset-px rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.12) 100%)",
                padding: "1px",
                WebkitMask:
                  "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
                animation: "borderShine 5s linear infinite",
              }}
            />
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative transition-transform duration-300 group-hover:-translate-x-0.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
        )}

        {/* Scrollable tags area - the border fades on both sides.
            The fade is created by a gradient mask on the scrollable container. */}
        <div
          className="relative min-w-0 flex-1 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 8%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, rgba(0,0,0,0.5) 92%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 8%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, rgba(0,0,0,0.5) 92%, transparent 100%)",
          }}
        >
          <div
            ref={scrollRef}
            className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-1"
            style={{ paddingLeft: "2px", paddingRight: "2px" }}
          >
            {tags.map((tag, idx) => {
              const isActive = tag === activeTag;
              return (
                <button
                  key={tag}
                  onClick={() => onChange(tag)}
                  style={{
                    animation: `tagEnter 360ms cubic-bezier(.4,0,.2,1) ${idx * 10}ms both`,
                  }}
                  className={cn(
                    "group relative flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-300",
                    isActive
                      ? "text-white"
                      : "text-white/65 hover:scale-[1.04] hover:text-white active:scale-95"
                  )}
                >
                  {/* Animated gradient border for all tags (replaces box border) */}
                  <span
                    className={cn(
                      "pointer-events-none absolute -inset-px rounded-full transition-opacity duration-300",
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(200,220,255,0.3) 50%, rgba(255,255,255,0.35) 100%)"
                        : "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.15) 100%)",
                      padding: "1px",
                      WebkitMask:
                        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                      animation: "borderShine 6s linear infinite",
                    }}
                  />
                  {/* Subtle glass fill for non-active tags, brighter for active */}
                  <span
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300",
                      isActive
                        ? "bg-white/[0.10] opacity-100"
                        : "bg-white/[0.04] opacity-0 group-hover:opacity-100"
                    )}
                  />
                  {/* Soft outer glow for active tag (replaces shadow) */}
                  {isActive && (
                    <span
                      className="pointer-events-none absolute -inset-0.5 rounded-full opacity-60 blur-md"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(167,139,250,0.4), rgba(236,72,153,0.3), rgba(56,189,248,0.4))",
                      }}
                    />
                  )}
                  <span className="relative tracking-tight text-[12px]">
                    {tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* > arrow slot - hidden when hideArrows is true (dropdown open) */}
        {!hideArrows && (
        <div className="relative flex shrink-0 items-center justify-center pl-2 pr-2">
          <button
            onClick={() => scroll(1)}
            aria-label="Next tags"
            className={cn(
              "group flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 backdrop-blur-2xl transition-all duration-300 active:scale-90",
              canScroll
                ? canRight
                  ? "opacity-100 hover:scale-110 hover:bg-white/[0.08] hover:text-white cursor-pointer"
                  : "opacity-25 cursor-not-allowed"
                : "opacity-20 cursor-not-allowed"
            )}
            style={{ boxShadow: "none" }}
          >
            <span
              className="pointer-events-none absolute -inset-px rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.12) 100%)",
                padding: "1px",
                WebkitMask:
                  "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
                animation: "borderShine 5s linear infinite reverse",
              }}
            />
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="relative transition-transform duration-300 group-hover:translate-x-0.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes borderShine {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes tagEnter {
          0% { opacity: 0; transform: translateY(4px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
