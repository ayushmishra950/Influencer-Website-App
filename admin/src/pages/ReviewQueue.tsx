import { useMemo } from 'react';
import { PageHeader } from '@/components/Layout';
import { InfluencerManager } from '@/components/InfluencerManager';
import { useStats } from '@/hooks/useInfluencers';
import type { InfluencerFilters } from '@/lib/types';

export function ReviewQueuePage() {
  const { data: stats } = useStats();
  // Stable reference: InfluencerManager resets its filters when this object changes.
  const locked = useMemo<Partial<InfluencerFilters>>(
    () => ({ status: 'pending', archived: 'false' }),
    [],
  );

  return (
    <div className="animate-in">
      <InfluencerManager
        header={
          <PageHeader
            title="Review queue"
            subtitle={
              stats?.pending
                ? `${stats.pending} registration${stats.pending === 1 ? '' : 's'} waiting — these creators cannot sign in yet`
                : 'Registrations waiting for verification'
          }
        />
        }
        lockedFilters={locked}
        showStatusFilter={false}
        bulkActions={['approve', 'reject', 'archive']}
        emptyTitle="Nothing to review"
        emptyDescription="Every registration has been processed. New sign-ups will appear here automatically."
      />
    </div>
  );
}
