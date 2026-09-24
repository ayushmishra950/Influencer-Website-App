import { imageUrl } from '@/lib/api';
import { initials } from '@/lib/format';

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  /**
   * Set on the violet hero. The normal fill is the brand gradient, which is the same
   * violet pair the hero uses — measured contrast 1.00, so the disc would be invisible.
   * On the hero it inverts into a light medallion instead.
   */
  onHero?: boolean;
}

export function Avatar({ name, src, size = 48, onHero = false }: AvatarProps) {
  const url = imageUrl(src);
  const ring = onHero
    ? { border: `${Math.max(2, Math.round(size * 0.03))}px solid rgba(255,255,255,0.92)` }
    : undefined;
  const base = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    ...ring,
  } as const;

  if (url) {
    return (
      // Uploads are served from whatever origin the API runs on, which changes between
      // local, Render and any future host. next/image would need every one of those
      // declared in remotePatterns up front, so a plain img is the honest choice here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`${name} profile photo`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ ...base, objectFit: 'cover', background: 'var(--ink-800)' }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center font-bold"
      style={{
        ...base,
        fontSize: Math.max(11, size * 0.36),
        background: onHero
          ? 'linear-gradient(135deg, var(--hero-plate), var(--hero-plate-2))'
          : 'linear-gradient(135deg, var(--violet-600), var(--violet-700))',
        color: onHero ? 'var(--hero-on-plate)' : '#ffffff',
      }}
    >
      {initials(name)}
    </span>
  );
}
