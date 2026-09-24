export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border px-3.5 py-2.5 text-[13px]"
      style={{
        background: 'var(--rose-bg)',
        color: 'var(--rose-400)',
        borderColor: 'color-mix(in srgb, var(--rose-400) 30%, transparent)',
      }}
    >
      {message}
    </p>
  );
}
