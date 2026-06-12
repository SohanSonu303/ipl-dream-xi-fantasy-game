/**
 * Fixed, full-bleed stadium ambience that sits behind every screen:
 * floodlight glows, a faint pitch grid and slow drifting light.
 */
export function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Pitch grid */}
      <div className="absolute inset-0 bg-stadium-grid opacity-70" />

      {/* Floodlight pools */}
      <div className="absolute -top-40 left-1/2 h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-gold/10 blur-[120px]" />
      <div className="absolute -left-32 top-1/3 h-[40vh] w-[40vw] rounded-full bg-sky-500/10 blur-[120px]" />
      <div className="absolute -right-32 bottom-0 h-[45vh] w-[45vw] rounded-full bg-purple-500/10 blur-[130px]" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_30%,rgba(5,7,15,0.85))]" />

      {/* Top scan line / broadcast bar */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    </div>
  );
}
