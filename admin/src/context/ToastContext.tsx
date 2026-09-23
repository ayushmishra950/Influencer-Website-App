import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLE: Record<ToastTone, { color: string; bg: string; border: string; icon: string }> = {
  success: { color: 'var(--mint-400)', bg: 'var(--mint-bg)', border: 'rgba(52,211,153,.3)', icon: '✓' },
  error: { color: 'var(--rose-400)', bg: 'var(--rose-bg)', border: 'rgba(251,113,133,.3)', icon: '!' },
  info: { color: 'var(--violet-400)', bg: 'var(--violet-bg)', border: 'rgba(124,92,252,.3)', icon: 'i' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, tone, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 4500);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: 380,
        }}
      >
        {toasts.map((toast) => {
          const tone = TONE_STYLE[toast.tone];
          return (
            <div
              key={toast.id}
              className="card row gap-3 animate-in"
              style={{ padding: '12px 16px', borderColor: tone.border, boxShadow: 'var(--shadow-lg)' }}
            >
              <span
                className="center"
                style={{
                  width: 22, height: 22, flexShrink: 0,
                  borderRadius: '50%', background: tone.bg, color: tone.color,
                  fontSize: 12, fontWeight: 700,
                }}
              >
                {tone.icon}
              </span>
              <span style={{ fontSize: 13.5 }}>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
