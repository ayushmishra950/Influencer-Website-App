/** The mark, drawn rather than imported, so it stays crisp and themeable at any size. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="13" fill="none" stroke="var(--violet-500)" strokeWidth="4" />
      <circle cx="16" cy="16" r="4" fill="var(--gold-400)" />
    </svg>
  );
}

export function Wordmark({ size = 32, onHero = false }: { size?: number; onHero?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Logo size={size} />
      <span className="leading-none">
        <span
          className="block font-bold tracking-tight"
          style={{ fontSize: size * 0.56, color: onHero ? 'var(--hero-text)' : 'var(--text)' }}
        >
          Aura
        </span>
        <span
          className="block font-semibold uppercase"
          style={{
            fontSize: size * 0.26,
            letterSpacing: '0.16em',
            color: onHero ? 'var(--hero-muted)' : 'var(--text-3)',
          }}
        >
          Creator Network
        </span>
      </span>
    </span>
  );
}
