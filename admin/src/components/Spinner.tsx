/** Decorative by itself — the surrounding control or loader supplies the label. */
export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

type LoaderFill = 'page' | 'screen';

/**
 * How much room the loader should occupy while it waits.
 *
 * `page` fills what is left of the viewport under the topbar, so the spinner lands
 * in the optical centre instead of clinging to the top of a tall, empty page.
 * `screen` is for loaders that render outside the dashboard shell, such as the
 * session restore before the sidebar exists.
 */
const MIN_HEIGHT: Record<LoaderFill, string> = {
  page: 'calc(100vh - var(--topbar-h) - 140px)',
  screen: '100vh',
};

interface PageLoaderProps {
  label?: string;
  fill?: LoaderFill;
}

export function PageLoader({ label = 'Loading', fill = 'page' }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        minHeight: MIN_HEIGHT[fill],
        width: '100%',
        color: 'var(--text-3)',
      }}
    >
      <Spinner size={26} />
      <span style={{ fontSize: 13 }}>{label}…</span>
    </div>
  );
}
