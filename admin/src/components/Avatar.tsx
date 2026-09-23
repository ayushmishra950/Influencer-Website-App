import { imageUrl, initials } from '@/lib/format';

interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
}

export function Avatar({ name, src, size = 36 }: AvatarProps) {
  const url = imageUrl(src ?? '');
  return url ? (
    <img
      className="avatar"
      src={url}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  ) : (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
