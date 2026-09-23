export function Logo({ size = 30, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="row gap-3">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="aura-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9B7CFF" />
            <stop offset="100%" stopColor="#4F34C4" />
          </linearGradient>
          <linearGradient id="aura-core" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2D089" />
            <stop offset="100%" stopColor="#D19F2D" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="13" stroke="url(#aura-ring)" strokeWidth="3.4" fill="none" />
        <circle cx="16" cy="16" r="4.4" fill="url(#aura-core)" />
      </svg>
      {withWordmark && (
        <span className="stack" style={{ lineHeight: 1.1 }}>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: 16, letterSpacing: '-0.02em' }}>
            Aura
          </strong>
          <span className="dim" style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Creator Network
          </span>
        </span>
      )}
    </span>
  );
}
