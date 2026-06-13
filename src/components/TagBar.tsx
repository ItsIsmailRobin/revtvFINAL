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
  // State-based hover tracking. On iOS Safari, :hover styles get
  // "stuck" after a tap, so we drive the visual hover effect with
  // React state instead of Tailwind's group-hover pseudo-class.
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const [hoveredArrow, setHoveredArrow] = useState<"left" | "right" | null>(
    null
  );
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

  // When the active tag changes, clear any lingering hover state so
  // the previously-hovered tag fades out cleanly (important on iPhone
  // where :hover styles otherwise stay stuck).
  useEffect(() => {
    setHoveredTag(null);
    setHoveredArrow(null);
  }, [activeTag]);

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
        {/* < arrow slot */}
        {!hideArrows && (
        <div className="relative flex shrink-0 items-center justify-center pl-2 pr-2">
          <button
            onClick={() => canLeft && scroll(-1)}
            aria-label="Previous tags"
            onTouchStart={() => setHoveredArrow("left")}
            onTouchEnd={() => setHoveredArrow(null)}
            onTouchCancel={() => setHoveredArrow(null)}
            onMouseEnter={() => setHoveredArrow("left")}
            onMouseLeave={() => setHoveredArrow(null)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 backdrop-blur-2xl transition-all duration-300 active:scale-90",
              canScroll
                ? canLeft
                  ? "opacity-100 cursor-pointer"
                  : "opacity-25 cursor-not-allowed"
                : "opacity-20 cursor-not-allowed"
            )}
            style={{
              transform:
                canScroll && canLeft && hoveredArrow === "left"
                  ? "scale(1.10)"
                  : "scale(1)",
              backgroundColor:
                canScroll && canLeft && hoveredArrow === "left"
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.04)",
              color:
                canScroll && canLeft && hoveredArrow === "left"
                  ? "rgba(255,255,255,1)"
                  : "rgba(255,255,255,0.7)",
              boxShadow: "none",
            }}
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
              className="relative transition-transform duration-300"
              style={{
                transform:
                  hoveredArrow === "left" ? "translateX(-2px)" : "translateX(0)",
              }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
        )}

        {/* Scrollable tags area */}
        <div
          className="relative min-w-0 flex-1"
          style={{
            overflow: "hidden",
            padding: "6px 0",
            borderRadius: "999px",
          }}
        >
          <div
            ref={scrollRef}
            className="scrollbar-hide flex items-center gap-2 overflow-x-auto"
            style={{ paddingLeft: "8px", paddingRight: "8px", paddingTop: "6px", paddingBottom: "6px" }}
          >
            {tags.map((tag, idx) => {
              const isActive = tag === activeTag;
              // State-based hover: only true when the user is actively
              // touching/hovering this specific tag. Clears on touch end
              // and mouse leave so the effect fades out cleanly.
              const isHovering = hoveredTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => {
                    // After clicking, fade out the hover effect by
                    // clearing the hovered state immediately. This
                    // ensures a clean UI on iPhone where :hover styles
                    // otherwise get stuck after a tap.
                    setHoveredTag(null);
                    onChange(tag);
                  }}
                  onTouchStart={() => setHoveredTag(tag)}
                  onTouchEnd={() => setHoveredTag(null)}
                  onTouchCancel={() => setHoveredTag(null)}
                  onMouseEnter={() => setHoveredTag(tag)}
                  onMouseLeave={() => setHoveredTag(null)}
                  style={{
                    animation: `tagEnter 360ms cubic-bezier(.4,0,.2,1) ${idx * 10}ms both`,
                    color: isActive
                      ? "#fff"
                      : isHovering
                      ? "#fff"
                      : "rgba(255,255,255,0.65)",
                    transform: isHovering && !isActive ? "scale(1.04)" : "scale(1)",
                  }}
                  className={cn(
                    "relative flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-300 active:scale-95"
                  )}
                >
                  {/* Animated gradient border */}
                  <span
                    className={cn(
                      "pointer-events-none absolute -inset-px rounded-full transition-opacity duration-300",
                      isActive
                        ? "opacity-100"
                        : isHovering
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(200,220,255,0.14) 50%, rgba(255,255,255,0.24) 100%)"
                        : "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.15) 100%)",
                      padding: "1px",
                      WebkitMask:
                        "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                      animation: "borderShine 6s linear infinite",
                    }}
                  />
                  {/* Glass fill */}
                  <span
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300",
                      isActive
                        ? "opacity-100"
                        : isHovering
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.16) 100%)"
                        : "rgba(255,255,255,0.04)",
                      backdropFilter: isActive ? "blur(18px) saturate(180%)" : undefined,
                      WebkitBackdropFilter: isActive ? "blur(18px) saturate(180%)" : undefined,
                      boxShadow: isActive
                        ? "0 0 6px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(255,255,255,0.05)"
                        : undefined,
                    }}
                  />
                  <span className="relative tracking-tight text-[12px]">
                    {tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* > arrow slot */}
        {!hideArrows && (
        <div className="relative flex shrink-0 items-center justify-center pl-2 pr-2">
          <button
            onClick={() => scroll(1)}
            aria-label="Next tags"
            onTouchStart={() => setHoveredArrow("right")}
            onTouchEnd={() => setHoveredArrow(null)}
            onTouchCancel={() => setHoveredArrow(null)}
            onMouseEnter={() => setHoveredArrow("right")}
            onMouseLeave={() => setHoveredArrow(null)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-white/70 backdrop-blur-2xl transition-all duration-300 active:scale-90",
              canScroll
                ? canRight
                  ? "opacity-100 cursor-pointer"
                  : "opacity-25 cursor-not-allowed"
                : "opacity-20 cursor-not-allowed"
            )}
            style={{
              transform:
                canScroll && canRight && hoveredArrow === "right"
                  ? "scale(1.10)"
                  : "scale(1)",
              backgroundColor:
                canScroll && canRight && hoveredArrow === "right"
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.04)",
              color:
                canScroll && canRight && hoveredArrow === "right"
                  ? "rgba(255,255,255,1)"
                  : "rgba(255,255,255,0.7)",
              boxShadow: "none",
            }}
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
              className="relative transition-transform duration-300"
              style={{
                transform:
                  hoveredArrow === "right" ? "translateX(2px)" : "translateX(0)",
              }}
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
