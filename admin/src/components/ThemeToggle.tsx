import { useTheme } from '@/context/ThemeContext';
import { Icon } from './Icon';

/**
 * Swaps the whole dashboard between dark and light.
 *
 * Both icons are always rendered and cross-faded, so the control never reflows
 * and the change reads as one continuous motion rather than a swap.
 */
export function ThemeToggle() {
  const { theme, toggle, followsSystem } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      className="btn btn-ghost btn-icon"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={
        followsSystem
          ? `Following your system theme (${theme}). Click for ${next}.`
          : `Switch to ${next} theme`
      }
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <span
        style={{
          position: 'absolute',
          display: 'flex',
          color: 'var(--gold-400)',
          opacity: theme === 'dark' ? 1 : 0,
          transform: `rotate(${theme === 'dark' ? 0 : -90}deg) scale(${theme === 'dark' ? 1 : 0.6})`,
          transition: 'opacity .22s var(--ease), transform .22s var(--ease)',
        }}
      >
        <Icon name="moon" size={16} />
      </span>
      <span
        style={{
          position: 'absolute',
          display: 'flex',
          color: 'var(--amber-400)',
          opacity: theme === 'light' ? 1 : 0,
          transform: `rotate(${theme === 'light' ? 0 : 90}deg) scale(${theme === 'light' ? 1 : 0.6})`,
          transition: 'opacity .22s var(--ease), transform .22s var(--ease)',
        }}
      >
        <Icon name="sun" size={16} />
      </span>
    </button>
  );
}
