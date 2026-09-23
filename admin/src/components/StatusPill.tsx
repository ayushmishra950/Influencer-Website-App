import type { Status } from '@/lib/types';

interface StatusPillProps {
  status: Status;
  archived?: boolean;
}

/** Archived outranks the status: it is why the record is off the listing. */
export function StatusPill({ status, archived }: StatusPillProps) {
  const label = archived ? 'archived' : status;
  return <span className={`pill pill-${label}`}>{label}</span>;
}
