export default function Header() {
  const handleLogoClick = () => {
    const url = window.location.origin + window.location.pathname;
    window.location.href = url;
  };

  // Hidden playlist refresh — dispatches a custom event that App.tsx
  // listens for to re-fetch the playlist. The button looks like a normal
  // status indicator but clicking it triggers a playlist refresh.
  const handleLivePlaylistClick = () => {
    window.dispatchEvent(new CustomEvent("revtv:refresh-playlist"));
  };

  return (
    <header className="relative z-20 flex items-center justify-between border-b border-white/5 bg-black/60 px-4 py-3 sm:px-8 sm:py-4">
      <button
        onClick={handleLogoClick}
        aria-label="RevTV - Go to homepage"
        className="group block transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <img
          src="https://i.postimg.cc/RZGz0gz9/Logo.png"
          alt="RevTV"
          className="block h-10 w-auto object-contain transition-all duration-500 group-hover:brightness-110 sm:h-12"
          style={{ maxWidth: "200px" }}
          loading="eager"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </button>

      <button
        onClick={handleLivePlaylistClick}
        aria-label="Live Playlist"
        className="hidden cursor-default items-center gap-2 transition-all duration-300 hover:scale-105 sm:flex"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span
          className="text-xs font-semibold uppercase tracking-widest text-emerald-400"
          style={{
            animation: "liveTextPulse 2.4s ease-in-out infinite",
          }}
        >
          Live Playlist
        </span>
      </button>

      <button
        onClick={handleLivePlaylistClick}
        aria-label="Live Playlist"
        className="cursor-default transition-all duration-300 hover:scale-110 sm:hidden"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      </button>

      <style>{`
        @keyframes liveTextPulse {
          0%, 100% {
            opacity: 0.7;
            text-shadow: 0 0 6px rgba(52, 211, 153, 0.4);
          }
          50% {
            opacity: 1;
            text-shadow: 0 0 12px rgba(52, 211, 153, 0.8), 0 0 20px rgba(52, 211, 153, 0.4);
          }
        }
      `}</style>
    </header>
  );
}
