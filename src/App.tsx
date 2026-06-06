import { useEffect, useMemo, useRef, useState } from "react";
import Background from "./components/Background";
import Header from "./components/Header";
import TagBar from "./components/TagBar";
import ChannelList from "./components/ChannelList";
import Player from "./components/Player";
import Footer from "./components/Footer";
import { parseM3U, getUniqueGroups, type Channel } from "./utils/parseM3U";

const PLAYLIST_URL =
  "https://raw.githubusercontent.com/ItsIsmailRobin/playlisttv/refs/heads/main/playlist.m3u";

function CategoryHeader({
  groupsLength,
  isOpen,
  onToggle,
}: {
  groupsLength: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/5 px-4 py-2">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60 sm:text-base">
        Categories
      </h3>
      {/* Clickable count badge - acts as a dropdown trigger. No icon, the
          badge itself is the trigger. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Hide all categories" : "Show all categories"}
        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/60 transition-all duration-200 hover:border-white/25 hover:bg-white/[0.08] hover:text-white/90 active:scale-95"
      >
        {groupsLength}
      </button>
    </div>
  );
}

function ChannelCount({
  count,
  activeTag,
}: {
  count: number;
  activeTag: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40 sm:text-xs">
          {activeTag}
        </span>
        {/* Small slider indicator: 2px wide, 8px tall — a tiny visual
            accent that matches the overall minimal aesthetic. */}
        <span
          className="block rounded-full bg-white/15"
          style={{ width: "2px", height: "8px" }}
          aria-hidden
        />
      </div>
      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/60">
        {count}
      </span>
    </div>
  );
}

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string>("All");
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(PLAYLIST_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load playlist");
      const text = await res.text();
      const parsed = parseM3U(text);
      if (parsed.length === 0) {
        throw new Error("No channels found in playlist");
      }
      setChannels(parsed);
      if (!activeChannel) {
        setActiveChannel(parsed[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Could not load playlist");
    } finally {
      setLoading(false);
    }
  };

  // Background refresh: updates the channel list silently without
  // showing a loading state or interrupting the current playback.
  const refreshPlaylist = async () => {
    try {
      const res = await fetch(PLAYLIST_URL, { cache: "no-store" });
      if (!res.ok) return;
      const text = await res.text();
      const parsed = parseM3U(text);
      if (parsed.length === 0) return;

      // Preserve the currently playing channel by matching on URL
      const active = activeChannel;
      const same = active ? parsed.find((p) => p.url === active.url) : null;
      if (same) {
        // Keep the same channel object identity so HLS doesn't remount
        activeChannel && Object.assign(activeChannel, same);
      }
      setChannels(parsed);
    } catch {
      // silently ignore background refresh errors
    }
  };

  useEffect(() => {
    // Initial full fetch (shows loading spinner)
    fetchPlaylist();
    // Auto-refresh every 5 minutes using the silent background method
    // so current playback is never interrupted.
    const t = setInterval(refreshPlaylist, 5 * 60 * 1000);

    // Hidden manual refresh: listen for the custom event dispatched by
    // the "Live Playlist" indicator in the Header.
    const onRefresh = () => refreshPlaylist();
    window.addEventListener("revtv:refresh-playlist", onRefresh);

    return () => {
      clearInterval(t);
      window.removeEventListener("revtv:refresh-playlist", onRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => getUniqueGroups(channels), [channels]);
  const allTags = useMemo(() => ["All", ...groups], [groups]);

  const filtered = useMemo(() => {
    if (activeTag === "All") return channels;
    return channels.filter((c) => c.group === activeTag);
  }, [channels, activeTag]);

  const handleSelect = (ch: Channel) => {
    setActiveChannel(ch);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-screen text-white">
      <Background />
      <Header />

      <main className="relative mx-auto w-full max-w-[1600px] px-2 pb-8 pt-3 sm:px-4 sm:pt-4 lg:px-6">
        {/* Player + side info */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          <div>
            <Player channel={activeChannel} />
          </div>

          {/* Sidebar: category + channel list (desktop only) */}
          <aside className="hidden lg:block">
            <div
              className="rounded-2xl border shadow-none"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                backgroundColor: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <CategoryHeader
                groupsLength={groups.length}
                isOpen={categoriesOpen}
                onToggle={() => setCategoriesOpen((v) => !v)}
              />

              {/* Scrollable area: Categories + TagBar + All Channels +
                  channel list. No sticky — everything scrolls naturally. */}
              <div
                className="scrollbar-hide max-h-[calc(100vh-7rem)] overflow-y-auto"
                style={{ scrollbarWidth: "none" }}
              >
                {categoriesOpen ? (
                  <AllTagsPanel
                    tags={allTags}
                    activeTag={activeTag}
                    onSelect={(t) => {
                      onChange(t);
                      setCategoriesOpen(false);
                    }}
                  />
                ) : (
                  <>
                    <TagBar
                      tags={allTags}
                      activeTag={activeTag}
                      onChange={setActiveTag}
                      hideArrows={categoriesOpen}
                    />
                    <div className="border-t border-white/5">
                      <ChannelCount
                        count={filtered.length}
                        activeTag={activeTag}
                      />
                      <ChannelList
                        channels={filtered}
                        activeId={activeChannel?.id}
                        onSelect={handleSelect}
                        loading={loading}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </aside>
        </section>

        {/* Mobile / tablet: tags + channel list below player */}
        <section className="mt-4 sm:mt-6 lg:hidden">
          <div
            className="rounded-2xl border shadow-none"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            <CategoryHeader
              groupsLength={groups.length}
              isOpen={categoriesOpen}
              onToggle={() => setCategoriesOpen((v) => !v)}
            />

            <div
              className="scrollbar-hide max-h-[calc(100vh-10rem)] overflow-y-auto"
              style={{ scrollbarWidth: "none" }}
            >
              {categoriesOpen ? (
                <AllTagsPanel
                  tags={allTags}
                  activeTag={activeTag}
                  onSelect={(t) => {
                    onChange(t);
                    setCategoriesOpen(false);
                  }}
                />
              ) : (
                <>
                  <TagBar
                    tags={allTags}
                    activeTag={activeTag}
                    onChange={setActiveTag}
                    hideArrows={categoriesOpen}
                  />
                  <div className="border-t border-white/5">
                    <ChannelCount
                      count={filtered.length}
                      activeTag={activeTag}
                    />
                    <ChannelList
                      channels={filtered}
                      activeId={activeChannel?.id}
                      onSelect={handleSelect}
                      loading={loading}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}. Retrying...
            <button
              onClick={fetchPlaylist}
              className="ml-3 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        )}

        <Footer />
      </main>
    </div>
  );

  // Local handler used by the AllTagsPanel inside the JSX above
  function onChange(tag: string) {
    setActiveTag(tag);
  }
}

/* ---------- All tags dropdown panel ---------- */

function AllTagsPanel({
  tags,
  activeTag,
  onSelect,
}: {
  tags: string[];
  activeTag: string;
  onSelect: (t: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) {
        // Click outside is handled by the parent toggle; nothing here.
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div
      ref={panelRef}
      className="overflow-hidden"
      style={{
        animation: "dropDownOpen 320ms cubic-bezier(.4,0,.2,1)",
      }}
    >
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, idx) => {
            const isActive = tag === activeTag;
            return (
              <button
                key={tag}
                onClick={() => onSelect(tag)}
                style={{
                  animation: `tagEnter 280ms cubic-bezier(.4,0,.2,1) ${
                    idx * 18
                  }ms both`,
                }}
                className={
                  "group relative flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-300 " +
                  (isActive
                    ? "text-white"
                    : "text-white/65 hover:scale-[1.04] hover:text-white active:scale-95")
                }
              >
                {/* Animated gradient border */}
                <span
                  className={
                    "pointer-events-none absolute -inset-px rounded-full transition-opacity duration-300 " +
                    (isActive
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100")
                  }
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
                {/* Glass fill */}
                <span
                  className={
                    "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300 " +
                    (isActive
                      ? "bg-white/[0.10] opacity-100"
                      : "bg-white/[0.04] opacity-0 group-hover:opacity-100")
                  }
                />
                {/* Soft outer glow for active */}
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

      <style>{`
        @keyframes dropDownOpen {
          0%   { opacity: 0; transform: translateY(-6px) scale(0.98); max-height: 0; }
          100% { opacity: 1; transform: translateY(0)   scale(1);    max-height: 600px; }
        }
        @keyframes borderShine {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes tagEnter {
          0%   { opacity: 0; transform: translateY(4px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
