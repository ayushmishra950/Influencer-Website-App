import { ImageResponse } from 'next/og';
import { fetchCreator } from '@/lib/api';
import { initials, shortLocation } from '@/lib/format';

export const alt = 'Creator profile on Aura';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** A share card carrying the creator's own name, niche and city. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const creator = await fetchCreator(id);

  const name = creator?.name ?? 'Creator';
  const niche = creator?.category?.name ?? '';
  const place = shortLocation(creator?.location);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #6344e8, #4f34c4)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        {/* The initials medallion, not the photo: an uploaded image may be missing, and
            a half-rendered card is worse than a consistent one. */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            color: '#4f34c4',
            fontSize: 62,
            fontWeight: 700,
          }}
        >
          {initials(name)}
        </div>

        <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, marginTop: 40 }}>{name}</div>

        {!!(niche || place) && (
          <div style={{ display: 'flex', fontSize: 30, opacity: 0.9, marginTop: 16 }}>
            {[niche && `${niche} creator`, place].filter(Boolean).join(' · ')}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            marginTop: 40,
            padding: '10px 22px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.18)',
            fontSize: 22,
            letterSpacing: 2,
          }}
        >
          VERIFIED ON AURA
        </div>
      </div>
    ),
    size,
  );
}
