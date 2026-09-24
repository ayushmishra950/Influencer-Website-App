import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useNotifications } from '@/context/NotificationContext';
import { formatRelative } from '@/lib/format';
import { useConfirm } from '@/context/ConfirmContext';
import { confirmClearNotifications } from '@/lib/confirmations';
import type { AppNotification } from '@/lib/socket';

/** Colour cue per event, so the list is scannable without reading every line. */
const TONE: Record<string, { color: string; bg: string }> = {
  'influencer.registered': { color: 'var(--amber-400)', bg: 'var(--amber-bg)' },
  'enquiry.received': { color: 'var(--violet-400)', bg: 'var(--violet-bg)' },
  'profile.approved': { color: 'var(--mint-400)', bg: 'var(--mint-bg)' },
  'profile.restored': { color: 'var(--mint-400)', bg: 'var(--mint-bg)' },
  'profile.rejected': { color: 'var(--rose-400)', bg: 'var(--rose-bg)' },
  'profile.deleted': { color: 'var(--rose-400)', bg: 'var(--rose-bg)' },
  'profile.archived': { color: 'var(--slate-400)', bg: 'var(--slate-bg)' },
  'profile.updated': { color: 'var(--violet-400)', bg: 'var(--violet-bg)' },
};

export function NotificationBell() {
  const { notifications, unread, connected, markRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const confirm = useConfirm();

  async function requestClear() {
    const { confirmed } = await confirm(confirmClearNotifications(notifications.length));
    if (confirmed) void clearAll();
  }
  const panelRef = useRef<HTMLDivElement>(null);

  // Click-away and Escape both close the panel.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function openNotification(item: AppNotification) {
    if (!item.read) await markRead(item._id).catch(() => undefined);
    setOpen(false);
    // The whole point of the click: land on the thing this is about. An enquiry has no
    // influencer to open, so it goes to the inbox it arrived in.
    if (item.type === 'enquiry.received') navigate('/enquiries');
    else if (item.influencer) navigate(`/influencers/${item.influencer}`);
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        className="btn btn-ghost btn-icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        style={{ position: 'relative', width: '100%', justifyContent: 'flex-start', paddingInline: 12, height: 38 }}
      >
        <Icon name="bell" size={17} />
        <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1, textAlign: 'left' }}>Notifications</span>

        {unread > 0 && (
          <span
            className="center mono"
            style={{
              minWidth: 20, height: 20, padding: '0 6px', borderRadius: 'var(--r-full)',
              background: 'var(--grad-brand)', color: '#fff', fontSize: 11, fontWeight: 700,
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}

        {/* Live-connection dot: a stale badge is worse than an obviously offline one. */}
        <span
          title={connected ? 'Live' : 'Reconnecting…'}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: connected ? 'var(--mint-400)' : 'var(--text-3)',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          className="card animate-in"
          style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: 0,
            width: 340, maxHeight: 440, display: 'flex', flexDirection: 'column',
            zIndex: 80, boxShadow: 'var(--shadow-lg)', background: 'var(--ink-850)',
          }}
        >
          <div className="between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <strong style={{ fontSize: 13.5 }}>Notifications</strong>
            <span className="row gap-1">
              {unread > 0 && (
                <button className="btn btn-subtle btn-sm" onClick={() => void markAllRead()}>Mark all read</button>
              )}
              {notifications.length > 0 && (
                <button className="btn btn-subtle btn-sm" onClick={() => void requestClear()} title="Clear all">
                  <Icon name="trash" size={14} />
                </button>
              )}
            </span>
          </div>

          <div style={{ overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="center stack gap-2" style={{ padding: '36px 20px', textAlign: 'center' }}>
                <Icon name="inbox" size={22} className="dim" />
                <span className="muted" style={{ fontSize: 13 }}>Nothing yet</span>
                <span className="dim" style={{ fontSize: 11.5 }}>
                  New registrations will appear here instantly.
                </span>
              </div>
            ) : (
              notifications.map((item) => {
                const tone = TONE[item.type] ?? { color: 'var(--violet-400)', bg: 'var(--violet-bg)' };
                return (
                  <button
                    key={item._id}
                    onClick={() => void openNotification(item)}
                    style={{
                      display: 'flex', gap: 10, width: '100%', textAlign: 'left',
                      padding: '11px 14px', borderBottom: '1px solid var(--line)',
                      background: item.read ? 'transparent' : 'rgba(124,92,252,.07)',
                    }}
                  >
                    <span
                      className="center"
                      style={{
                        width: 28, height: 28, flexShrink: 0, borderRadius: 'var(--r-sm)',
                        background: tone.bg, color: tone.color,
                      }}
                    >
                      <Icon
                        name={
                          item.type === 'influencer.registered'
                            ? 'users'
                            : item.type === 'enquiry.received'
                              ? 'inbox'
                              : 'edit'
                        }
                        size={14}
                      />
                    </span>

                    <span className="stack gap-1" style={{ minWidth: 0, flex: 1 }}>
                      <span className="between gap-2">
                        <strong style={{ fontSize: 12.8 }}>{item.title}</strong>
                        {!item.read && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--violet-400)', flexShrink: 0 }} />
                        )}
                      </span>
                      <span className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>{item.body}</span>
                      <span className="dim" style={{ fontSize: 11 }}>
                        {formatRelative(item.createdAt)}
                        {(item.influencer || item.type === 'enquiry.received') && ' · tap to open'}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
