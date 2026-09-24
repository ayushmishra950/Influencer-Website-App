import Link from 'next/link';
import type { Category } from '@/lib/types';

/**
 * A slow-moving strip of the niches that actually have creators in them.
 *
 * The list is rendered twice: the animation translates the track by exactly half its
 * width, so the second copy is in the first one's place when it loops and the seam is
 * invisible. The duplicate is hidden from assistive tech — one set of links is enough.
 *
 * It pauses on hover, and the global reduced-motion rule stops it outright for anyone
 * who has asked for that.
 */
export function NicheMarquee({ categories }: { categories: Category[] }) {
  const listed = categories.filter((category) => (category.influencerCount ?? 0) > 0);
  if (listed.length === 0) return null;

  const strip = (hidden: boolean) => (
    <ul className="flex gap-3" aria-hidden={hidden || undefined}>
      {listed.map((category) => (
        <li key={`${category._id}-${hidden}`}>
          <Link
            href={`/category/${category.slug}`}
            tabIndex={hidden ? -1 : undefined}
            className="flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-[14px] font-semibold whitespace-nowrap"
            style={{ background: 'var(--ink-950)', borderColor: 'var(--line)' }}
          >
            {category.name}
            <span
              className="rounded-full px-2 py-0.5 text-[11.5px]"
              style={{ background: 'var(--violet-bg)', color: 'var(--violet-400)' }}
            >
              {category.influencerCount}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="marquee">
      <div className="marquee-track">
        {strip(false)}
        {strip(true)}
      </div>
    </div>
  );
}
