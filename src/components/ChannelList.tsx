import type { Channel } from "../utils/parseM3U";
import { cn } from "../utils/cn";

interface ChannelListProps {
  channels: Channel[];
  activeId?: string;
  onSelect: (ch: Channel) => void;
  loading: boolean;
}

export default function ChannelList({
  channels,
  activeId,
  onSelect,
  loading,
}: ChannelListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 px-3 py-3 sm:px-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-16 w-full animate-pulse rounded-xl border border-white/5 bg-white/[0.03]"
          />
        ))}
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-white/40"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <p className="text-sm text-white/50">No channels in this category</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-3 sm:px-4">
      {channels.map((ch, i) => {
        const isActive = ch.id === activeId;
        return (
          <button
            key={ch.id}
            onClick={() => onSelect(ch)}
            style={{
              animation: `chEnter 380ms cubic-bezier(.4,0,.2,1) ${Math.min(
                i * 14,
                280
              )}ms both`,
            }}
            className={cn(
              "group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border p-2.5 text-left transition-all duration-300 sm:gap-4 sm:p-3",
              isActive
                ? "border-white/40 bg-white/10"
                : "border-white/[0.06] bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] active:scale-[0.99]"
            )}
          >
            {/* Index / number */}
            <div
              className={cn(
                "hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums sm:flex",
                isActive
                  ? "bg-white text-slate-900"
                  : "bg-white/5 text-white/50"
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </div>

            {/* Logo — round crop, transparent bg */}
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-transparent sm:h-12 sm:w-12">
              {ch.logo ? (
                <img
                  src={ch.logo}
                  alt={ch.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full rounded-full object-contain transition-transform duration-500 group-hover:scale-110"
                  style={{ background: "transparent" }}
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                    const parent = el.parentElement!;
                    parent.classList.add("flex", "items-center", "justify-center");
                    const initial = document.createElement("span");
                    initial.className = "text-sm font-semibold text-white/60 sm:text-base";
                    initial.textContent = ch.name.charAt(0).toUpperCase();
                    parent.appendChild(initial);
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full text-sm font-semibold text-white/60 sm:text-base">
                  {ch.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "truncate text-sm font-medium sm:text-base",
                  isActive ? "text-white" : "text-white/85 group-hover:text-white"
                )}
              >
                {ch.name}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/40 sm:text-xs">
                <span className="truncate">{ch.group}</span>
              </div>
            </div>

            {/* Right side: status / arrow */}
            <div className="flex shrink-0 items-center gap-2">
              {isActive && (
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-emerald-300">
                    On Air
                  </span>
                </div>
              )}
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
                  isActive
                    ? "bg-white text-slate-900"
                    : "bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white"
                )}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="ml-0.5"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>

            <span
              className={cn(
                "pointer-events-none absolute inset-0 -z-10 rounded-xl opacity-0 transition-opacity duration-500",
                "bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-sky-500/10",
                isActive && "opacity-100"
              )}
            />
          </button>
        );
      })}

      <style>{`
        @keyframes chEnter {
          0% { opacity: 0; transform: translateY(8px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
