import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ open, title, description, onClose, children, footer, width = 480 }: ModalProps) {
  // Escape closes, and the page behind must not scroll while the dialog is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 150,
        display: 'grid', placeItems: 'center', padding: 20,
        background: 'var(--backdrop)', backdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="card animate-in"
        style={{ width: '100%', maxWidth: width, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="between gap-4" style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <div className="stack gap-1">
            <h2>{title}</h2>
            {description && <p className="muted" style={{ fontSize: 13 }}>{description}</p>}
          </div>
          <button className="btn btn-subtle btn-icon" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" size={16} />
          </button>
        </div>

        {children && <div style={{ padding: 20, overflowY: 'auto' }}>{children}</div>}

        {footer && (
          <div className="row gap-2" style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', justifyContent: 'flex-end' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
