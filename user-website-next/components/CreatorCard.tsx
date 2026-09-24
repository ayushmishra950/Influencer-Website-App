import Link from 'next/link';
import { imageUrl } from '@/lib/api';
import { handleFrom, initials, memberSince, shortLocation } from '@/lib/format';
import type { Creator } from '@/lib/types';

/**
 * The photo leads the card.
 *
 * The crop is anchored to the top of the image, not its centre. These are portraits
 * squared off, so the head is already at the very top with no headroom to spare -- a
 * centred crop into a wider box takes the top of it off. Anchoring to the top spends
 * the whole crop on the bottom of the frame, which is torso and background.
 *
 * A creator without a photo gets the same block filled with their initials instead of
 * an empty grey rectangle, so a half-filled directory still reads as a finished grid.
 */
function Cover({ name, src }: { name: string; src?: string }) {
  const url = imageUrl(src);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: 'var(--ink-800)' }}>
      {url ? (
        // Uploads are served from whatever origin the API runs on, which changes between
        // local, Render and any future host. next/image would need every one of those
        // declared in remotePatterns up front, so a plain img is the honest choice here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`${name} profile photo`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-bold"
          style={{
            fontSize: 44,
            letterSpacing: '0.02em',
            background: 'linear-gradient(135deg, var(--violet-600), var(--violet-700))',
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          {initials(name)}
        </span>
      )}

      {/* Scrim, so the badge stays legible whatever the photo underneath is doing. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-16"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.38), transparent)' }}
      />

      <span
        className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
        style={{ background: 'rgba(255,255,255,0.94)', color: '#0f7a56' }}
        title="Reviewed by the Aura team before being listed"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Verified
      </span>
    </div>
  );
}

export function CreatorCard({ creator }: { creator: Creator }) {
  const location = shortLocation(creator.location);
  const instagram = handleFrom(creator.social?.instagram);
  const youtube = handleFrom(creator.social?.youtube);

  return (
    <Link
      href={`/creators/${creator._id}`}
      className="card card-hover block overflow-hidden"
      // The whole card is one link, so the name inside must not be a second one.
      aria-label={`${creator.name}, ${creator.category?.name ?? 'creator'}${location ? ` in ${location}` : ''}`}
    >
      <Cover name={creator.name} src={creator.profileImage} />

      <div className="p-5">
        <h3 className="truncate text-[16.5px] font-bold">{creator.name}</h3>

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

        {!!creator.bio && (
          <p className="clamp-2 mt-3.5 text-[13.5px] leading-[1.6]" style={{ color: 'var(--text-2)' }}>
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
      </div>
    </Link>
  );
}
