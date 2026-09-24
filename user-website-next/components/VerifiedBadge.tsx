/** Every listed creator is reviewed, so the badge is a statement about the whole list. */
export function VerifiedBadge() {
  return (
    <span
      className="chip"
      style={{ background: 'var(--mint-bg)', color: 'var(--mint-400)' }}
      title="Reviewed by the Aura team before being listed"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 6 9 17l-5-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Verified
    </span>
  );
}
