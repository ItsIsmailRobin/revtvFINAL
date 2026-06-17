export default function Header() {
  const handleLogoClick = () => {
    window.location.href = window.location.origin + window.location.pathname;
  };
  const handleLivePlaylistClick = () => {
    window.dispatchEvent(new CustomEvent("revtv:refresh-playlist"));
  };

  return (
    <header className="relative z-20 flex items-center justify-between border-b border-white/5 bg-black/50 px-4 py-3 sm:px-8 sm:py-4">
      <button onClick={handleLogoClick} aria-label="RevTV - Go to homepage"
        className="group block transition-all duration-300 hover:scale-105 active:scale-95">
        <img src="https://i.postimg.cc/RZGz0gz9/Logo.png" alt="RevTV"
          className="block h-10 w-auto object-contain transition-all duration-500 group-hover:brightness-110 sm:h-12"
          style={{ maxWidth:"200px" }} loading="eager"
          onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
      </button>

      {/* Update Playlist pill — no border/outline, purple dot + text */}
      <button onClick={handleLivePlaylistClick} aria-label="Update Playlist — click to refresh"
        className="group flex cursor-pointer items-center gap-2 px-3.5 py-2 transition-all duration-300 hover:scale-105 active:scale-95"
        style={{
          background: "transparent",
          border: "none",
          boxShadow: "none",
          borderRadius: "8px",
        }}>
        {/* Animated purple dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ backgroundColor: "#6614c4" }} />
          <span className="relative inline-flex h-2 w-2 rounded-full"
            style={{ backgroundColor: "#6614c4", boxShadow: "0 0 6px rgba(102,20,196,0.9), 0 0 12px rgba(102,20,196,0.5)" }} />
        </span>
        {/* Text */}
        <span className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: "#6614c4", animation: "updatePulse 2.4s ease-in-out infinite" }}>
          Update Playlist
        </span>
      </button>

      <style>{`
        @keyframes updatePulse {
          0%,100% { opacity:.75; }
          50%      { opacity:1; text-shadow:0 0 14px rgba(102,20,196,0.85),0 0 22px rgba(102,20,196,0.4); }
        }
      `}</style>
    </header>
  );
}
