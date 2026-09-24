import { ImageResponse } from 'next/og';

export const alt = 'Aura — a verified directory of content creators';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The card people see when a link is shared. Generated rather than designed by hand so
 * it always matches the site's own colours, and so there is no static asset to forget
 * to update. Plain divs and inline styles only — this renders in Satori, not a browser.
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #6344e8, #4f34c4)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: 999,
              border: '6px solid #ffffff', display: 'flex',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 30, fontWeight: 700 }}>Aura</span>
            <span style={{ fontSize: 14, letterSpacing: 4, opacity: 0.85 }}>CREATOR NETWORK</span>
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, lineHeight: 1.1, marginTop: 48 }}>
          Find creators worth working with
        </div>

        <div style={{ display: 'flex', fontSize: 28, opacity: 0.9, marginTop: 24 }}>
          A verified directory — every profile reviewed before it goes live.
        </div>
      </div>
    ),
    size,
  );
}
