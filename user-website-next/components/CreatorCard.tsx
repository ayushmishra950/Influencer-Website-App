import Link from 'next/link';
import { Avatar } from './Avatar';
import { VerifiedBadge } from './VerifiedBadge';
import { handleFrom, memberSince, shortLocation } from '@/lib/format';
import type { Creator } from '@/lib/types';

export function CreatorCard({ creator }: { creator: Creator }) {
  const location = shortLocation(creator.location);
  const instagram = handleFrom(creator.social?.instagram);
  const youtube = handleFrom(creator.social?.youtube);

  return (
    <Link
      href={`/creators/${creator._id}`}
      className="card card-hover block p-5"
      // The whole card is one link, so the name inside must not be a second one.
      aria-label={`${creator.name}, ${creator.category?.name ?? 'creator'}${location ? ` in ${location}` : ''}`}
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={creator.name} src={creator.profileImage} size={52} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-[15.5px] font-bold">{creator.name}</h3>
            <VerifiedBadge />
          </div>

          {!!location && (
            <p className="mt-1 truncate text-[13px]" style={{ color: 'var(--text-3)' }}>
              {location}
            </p>
          )}

          {!!creator.category && (
            <span
              className="chip mt-2.5"
              style={{ background: 'var(--violet-bg)', color: 'var(--violet-400)' }}
            >
              {creator.category.name}
            </span>
          )}
        </div>
      </div>

      {!!creator.bio && (
        <p className="clamp-2 mt-4 text-[13.5px] leading-[1.6]" style={{ color: 'var(--text-2)' }}>
          {creator.bio}
        </p>
      )}

      <div
        className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-[12px]"
        style={{ color: 'var(--text-3)' }}
      >
        <span className="truncate">
          {[instagram, youtube].filter(Boolean).join('  ·  ') || 'Profile on Aura'}
        </span>
        <span className="shrink-0">On Aura since {memberSince(creator.createdAt)}</span>
      </div>
    </Link>
  );
}
