import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Background from "./components/Background";
import Header from "./components/Header";
import TagBar from "./components/TagBar";
import ChannelList from "./components/ChannelList";
import Player from "./components/Player";
import Footer from "./components/Footer";
import FifaSchedule from "./components/FifaSchedule";
import { parseM3U, getUniqueGroups, type Channel } from "./utils/parseM3U";
import { getFresh, setPersisted } from "./utils/persist";

const PLAYLIST_URL =
  "https://raw.githubusercontent.com/ItsIsmailRobin/playlisttv/refs/heads/main/playlist.m3u";

// Glass sidebar — subtle glass, less vibrant, more transparent
const PANEL_STYLE: React.CSSProperties = {
  borderColor: "rgba(255,255,255,0.07)",
  backgroundColor: "rgba(8,4,18,0.32)",
  backdropFilter: "blur(24px) saturate(1.15)",
  WebkitBackdropFilter: "blur(24px) saturate(1.15)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.25)",
};

function CategoryHeader({ groupsLength, isOpen, onToggle }: { groupsLength:number; isOpen:boolean; onToggle:()=>void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Categories</h3>
      <button type="button" onClick={onToggle} aria-expanded={isOpen}
        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-white/50 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/80 active:scale-95">
        {groupsLength}
      </button>
    </div>
  );
}

function ChannelCount({ count, activeTag }: { count:number; activeTag:string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35 sm:text-xs">{activeTag}</span>
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/50">{count}</span>
    </div>
  );
}

export default function App() {
  const [channels, setChannels]     = useState<Channel[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [activeTag, setActiveTag]   = useState<string>("All");
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  // Splash animation shown on every visit/refresh while playlist loads
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  const failedChannelsRef = useRef<Set<string>>(new Set());
  const channelsRef = useRef<Channel[]>([]);
  useEffect(() => { channelsRef.current = channels; }, [channels]);

  // Remember the currently-watched channel for THIS session only (10-min
  // inactivity expiry + cleared entirely in Incognito — see utils/persist.ts).
  useEffect(() => {
    if (!activeChannel) return;
    setPersisted("revtv:lastChannelId", activeChannel.id);
  }, [activeChannel]);

  const handleStreamError = useCallback((failedChannel: Channel) => {
    failedChannelsRef.current.add(failedChannel.url);
    const all = channelsRef.current;
    if (!all.length) return;
    const idx = all.findIndex(c => c.id === failedChannel.id);
    for (let i = 1; i <= all.length; i++) {
      const next = all[(idx + i) % all.length];
      if (!failedChannelsRef.current.has(next.url)) { setActiveChannel(next); return; }
    }
    failedChannelsRef.current.clear();
    setActiveChannel(all[0]);
  }, []);

  // Dismiss splash — fade out then hide. Called after playlist loads
  // or after 10s timeout (whichever comes first).
  const dismissSplash = useCallback(() => {
    setSplashFading(true);
    setTimeout(() => setSplashVisible(false), 600);
  }, []);

  const fetchPlaylist = async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(PLAYLIST_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load playlist");
      const text = await res.text();
      const parsed = parseM3U(text);
      if (!parsed.length) throw new Error("No channels found");
      // Always refresh channels on every visit/load
      setChannels(parsed);
      // Restore the last-watched channel for THIS session only
      let restored: Channel | null = null;
      try {
        const savedId = getFresh("revtv:lastChannelId");
        if (savedId) restored = parsed.find(c => c.id === savedId) || null;
      } catch {}
      setActiveChannel(restored || parsed[0]);
    } catch (err: any) {
      setError(err?.message || "Could not load playlist");
    } finally {
      setLoading(false);
      // Dismiss splash after playlist finishes loading (min 2s for animation)
      setTimeout(dismissSplash, 800);
    }
  };

  const refreshPlaylist = async () => {
    try {
      const res = await fetch(PLAYLIST_URL, { cache: "no-store" });
      if (!res.ok) {
        window.dispatchEvent(new CustomEvent("revtv:refresh-error"));
        return;
      }
      const parsed = parseM3U(await res.text());
      if (!parsed.length) {
        window.dispatchEvent(new CustomEvent("revtv:refresh-error"));
        return;
      }
      setChannels(parsed);
      window.dispatchEvent(new CustomEvent("revtv:refresh-done"));
    } catch {
      window.dispatchEvent(new CustomEvent("revtv:refresh-error"));
    }
  };

  useEffect(() => {
    fetchPlaylist();
    // Safety: dismiss splash after 10s max even if fetch is still pending
    const splashTimeout = setTimeout(dismissSplash, 10000);
    const t = setInterval(refreshPlaylist, 5 * 60 * 1000);
    const onRefresh = () => refreshPlaylist();
    window.addEventListener("revtv:refresh-playlist", onRefresh);
    return () => { clearTimeout(splashTimeout); clearInterval(t); window.removeEventListener("revtv:refresh-playlist", onRefresh); };
  }, []);

  const groups   = useMemo(() => getUniqueGroups(channels), [channels]);
  const allTags  = useMemo(() => ["All", ...groups], [groups]);
  const filtered = useMemo(() => activeTag === "All" ? channels : channels.filter(c => c.group === activeTag), [channels, activeTag]);

  const handleSelect = (ch: Channel) => {
    setActiveChannel(ch);
    // On mobile the channel list is below the player — snap the page
    // instantly to the top so the player is always in view.
    // Use "instant" (no animation) so there's zero visible page movement.
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };

  // Player height = min(aspect-video of its column, 80vh)
  // Player col width = 100vw - 400px(sidebar) - 64px(lr padding lg) - 20px(gap) = 100vw - 484px
  // aspect-video height = (100vw - 484px) * 9/16
  // Panel top strips: CategoryHeader + TagBar + ChannelCount ≈ 110px
  const SIDEBAR_SCROLL_H = "calc(min((100vw - 484px) * 9 / 16, 80vh) - 110px)";

  const sidebarContent = (
    <>
      <CategoryHeader groupsLength={groups.length} isOpen={categoriesOpen} onToggle={() => setCategoriesOpen(v => !v)} />
      <div className="scrollbar-hide overflow-y-auto" style={{ scrollbarWidth:"none", maxHeight: SIDEBAR_SCROLL_H }}>
        {categoriesOpen ? (
          <AllTagsPanel tags={allTags} activeTag={activeTag} onSelect={t => { setActiveTag(t); setCategoriesOpen(false); }} />
        ) : (
          <>
            <TagBar tags={allTags} activeTag={activeTag} onChange={setActiveTag} hideArrows={false} />
            <div className="border-t border-white/5">
              <ChannelCount count={filtered.length} activeTag={activeTag} />
              <ChannelList channels={filtered} activeId={activeChannel?.id} onSelect={handleSelect} loading={loading} />
            </div>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen text-white">
      <Background />
      <Header />

      {/* ── Splash loading screen — shown on every visit/refresh ── */}
      {splashVisible && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(160deg,#0d0520 0%,#060112 40%,#09021a 70%,#050010 100%)",
            opacity: splashFading ? 0 : 1,
            transition: "opacity 600ms ease",
            pointerEvents: splashFading ? "none" : "all",
          }}
        >
          {/* Logo / Brand */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl"
              style={{ backdropFilter: "blur(12px)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34bf80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl font-bold tracking-tight text-white">RevTV</span>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">Updating Playlist</span>
            </div>
          </div>

          {/* Animated progress bar */}
          <div className="relative w-56 overflow-hidden rounded-full" style={{ height: "3px", backgroundColor: "rgba(255,255,255,0.08)" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: "linear-gradient(90deg, #34bf80, #7c3aed, #34bf80)",
                backgroundSize: "200% 100%",
                animation: "splashProgress 10s linear forwards, splashShimmer 1.8s ease-in-out infinite",
              }}
            />
          </div>

          {/* Dots animation */}
          <div className="mt-6 flex items-center gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-1.5 w-1.5 rounded-full bg-white/30"
                style={{ animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>

          <style>{`
            @keyframes splashProgress {
              0%   { width: 0%; }
              40%  { width: 60%; }
              80%  { width: 88%; }
              100% { width: 100%; }
            }
            @keyframes splashShimmer {
              0%   { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            @keyframes splashDot {
              0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
              40%            { opacity: 1;    transform: scale(1.2); }
            }
          `}</style>
        </div>
      )}

      <main className="relative mx-auto w-full max-w-[1600px] px-3 pb-8 pt-3 sm:px-5 sm:pt-4 lg:px-8">

        {/* ── Main grid: player left, sidebar right ── */}
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-5 lg:items-start">

          {/* Left column: player */}
          <div className="flex flex-col">
            <Player channel={activeChannel} onStreamError={handleStreamError} />
          </div>

          {/* Right column: sidebar (desktop) — self-start keeps top aligned with player */}
          <aside className="hidden self-start lg:block">
            <div className="rounded-2xl border" style={PANEL_STYLE}>
              {sidebarContent}
            </div>
          </aside>
        </section>

        {/* Mobile sidebar + footer below it */}
        <section className="mt-3 sm:mt-4 lg:hidden">
          <div className="rounded-2xl border" style={PANEL_STYLE}>
            <CategoryHeader groupsLength={groups.length} isOpen={categoriesOpen} onToggle={() => setCategoriesOpen(v => !v)} />
            <div className="scrollbar-hide max-h-[calc(100vh-10rem)] overflow-y-auto" style={{ scrollbarWidth:"none" }}>
              {categoriesOpen ? (
                <AllTagsPanel tags={allTags} activeTag={activeTag} onSelect={t => { setActiveTag(t); setCategoriesOpen(false); }} />
              ) : (
                <>
                  <TagBar tags={allTags} activeTag={activeTag} onChange={setActiveTag} hideArrows={false} />
                  <div className="border-t border-white/5">
                    <ChannelCount count={filtered.length} activeTag={activeTag} />
                    <ChannelList channels={filtered} activeId={activeChannel?.id} onSelect={handleSelect} loading={loading} />
                  </div>
                </>
              )}
            </div>
          </div>

        </section>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
            <button onClick={fetchPlaylist} className="ml-3 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10">Retry</button>
          </div>
        )}

        {/* FIFA 2026 Schedule */}
        <FifaSchedule />

      </main>
    </div>
  );
}

function AllTagsPanel({ tags, activeTag, onSelect }: { tags:string[]; activeTag:string; onSelect:(t:string)=>void }) {
  return (
    <div className="overflow-hidden px-4 py-3" style={{ animation:"dropDownOpen 320ms cubic-bezier(.4,0,.2,1)" }}>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, idx) => {
          const isActive = tag === activeTag;
          return (
            <button key={tag} onClick={() => onSelect(tag)}
              style={{ animation:`tagEnter 280ms cubic-bezier(.4,0,.2,1) ${idx * 18}ms both` }}
              className={"relative flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-300 " +
                (isActive ? "text-white" : "text-white/55 hover:text-white/85 active:scale-95")}>
              <span className={"pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300 " + (isActive ? "bg-white/[0.09] opacity-100" : "bg-white/[0.03] opacity-0 hover:opacity-100")} />
              <span className="relative tracking-tight text-[12px]">{tag}</span>
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes dropDownOpen { 0%{opacity:0;transform:translateY(-6px) scale(0.98)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes tagEnter { 0%{opacity:0;transform:translateY(4px) scale(0.96)} 100%{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  );
}
