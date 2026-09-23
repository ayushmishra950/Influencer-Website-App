import {
  createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { Modal } from '@/components/Modal';
import { Icon } from '@/components/Icon';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` is for anything that destroys data or ends a session. */
  tone?: 'danger' | 'primary' | 'success';
  /** Extra warning shown in an amber panel, e.g. "prefer Archive". */
  note?: string;
  /** Adds a free-text field whose value comes back in the result. */
  prompt?: {
    label: string;
    placeholder?: string;
    maxLength?: number;
    required?: boolean;
  };
}

export interface ConfirmResult {
  confirmed: boolean;
  reason: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<ConfirmResult>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

const DISMISSED: ConfirmResult = { confirmed: false, reason: '' };

/**
 * One dialog for the whole dashboard, awaited like a question:
 *
 *   const { confirmed } = await confirm({ title: 'Archive?', description: '…' });
 *   if (!confirmed) return;
 *
 * Every destructive or state-changing action goes through this, so the wording and
 * behaviour stay identical everywhere instead of each screen growing its own copy.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState('');
  const resolver = useRef<((result: ConfirmResult) => void) | null>(null);

  const settle = useCallback((result: ConfirmResult) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
    setReason('');
  }, []);

  const confirm = useCallback<ConfirmFn>((next) => {
    // A second request while one is open dismisses the first, so its caller is
    // never left awaiting a promise that can no longer settle.
    resolver.current?.(DISMISSED);
    setReason('');
    setOptions(next);
    return new Promise<ConfirmResult>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const value = useMemo(() => confirm, [confirm]);

  const tone = options?.tone ?? 'primary';
  const blocked = !!options?.prompt?.required && reason.trim().length === 0;

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      <Modal
        open={!!options}
        title={options?.title ?? ''}
        onClose={() => settle(DISMISSED)}
        width={440}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => settle(DISMISSED)}>
              {options?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              className={`btn ${tone === 'danger' ? 'btn-danger' : tone === 'success' ? 'btn-success' : 'btn-primary'}`}
              onClick={() => settle({ confirmed: true, reason: reason.trim() })}
              disabled={blocked}
              autoFocus
            >
              {options?.confirmLabel ?? 'Confirm'}
            </button>
          </>
        }
      >
        <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
          {tone === 'danger' && (
            <span
              className="center"
              style={{
                width: 34, height: 34, flexShrink: 0, borderRadius: 'var(--r-md)',
                background: 'var(--rose-bg)', color: 'var(--rose-400)',
              }}
            >
              <Icon name="warning" size={17} />
            </span>
          )}

          <div className="stack gap-3 grow" style={{ minWidth: 0 }}>
            <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
              {options?.description}
            </p>

            {options?.prompt && (
              <label className="field">
                <span className="label">{options.prompt.label}</span>
                <textarea
                  className="textarea"
                  style={{ minHeight: 72 }}
                  placeholder={options.prompt.placeholder}
                  maxLength={options.prompt.maxLength ?? 300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}

            {options?.note && (
              <div
                className="row gap-2"
                style={{
                  padding: '10px 12px', borderRadius: 'var(--r-md)',
                  background: 'var(--amber-bg)', color: 'var(--amber-400)',
                  border: '1px solid rgba(251,191,36,.25)', fontSize: 12.5,
                }}
              >
                <Icon name="warning" size={15} />
                <span>{options.note}</span>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return context;
}
