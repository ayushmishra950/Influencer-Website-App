import { useMemo } from 'react';
import { PageHeader } from '@/components/Layout';
import { InfluencerManager } from '@/components/InfluencerManager';
import type { InfluencerFilters } from '@/lib/types';

export function ArchivedPage() {
  const locked = useMemo<Partial<InfluencerFilters>>(
    () => ({ archived: 'true', status: 'all' }),
    [],
  );

  return (
    <div className="animate-in">
      <InfluencerManager
        header={
          <PageHeader
            title="Archived"
            subtitle="Hidden from the directory and from login, but kept on record"
          />
        }
        lockedFilters={locked}
        bulkActions={['restore', 'delete']}
        emptyTitle="Nothing archived"
        emptyDescription="Archiving hides an influencer without deleting them. Restore brings them straight back."
      />
    </div>
  );
}
