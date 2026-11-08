/**
 * OCD Live wordmark, drawn after the studio sign: heavy rounded "OCD" in
 * burnt orange, "Live" set underneath on the right.
 * ⚠️ Interim vector — replace with the official logo file when the client sends it.
 */
export function Logo({ className = "", live = true }: { className?: string; live?: boolean }) {
  return (
    <svg viewBox="0 0 132 64" className={className} role="img" aria-label="OCD Live">
      <defs>
        <linearGradient id="ocd-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8843f" />
          <stop offset="1" stopColor="#b4521c" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#ocd-grad)" strokeWidth="9" strokeLinecap="round">
        <ellipse cx="22" cy="22" rx="17" ry="16" />
        <path d="M74 10.5 A17 16 0 1 0 74 33.5" />
        <path d="M89 6.5 h12 a16 15.5 0 0 1 0 31 h-12 z" strokeLinejoin="round" />
      </g>
      {live && (
        <text x="130" y="61" textAnchor="end" fontFamily="var(--font-manrope), Arial, sans-serif" fontWeight="800" fontSize="22" letterSpacing="-0.5" fill="currentColor">
          Live
        </text>
      )}
    </svg>
  );
}
