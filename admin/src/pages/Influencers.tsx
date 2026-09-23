import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/Layout';
import { InfluencerManager } from '@/components/InfluencerManager';
import { Icon } from '@/components/Icon';

export function InfluencersPage() {
  return (
    <div className="animate-in">
      <InfluencerManager
        header={
          <PageHeader
            title="Influencers"
            subtitle="Every active record on the platform"
            actions={
              <Link className="btn btn-primary" to="/influencers/new">
                <Icon name="plus" size={16} />
                Add influencer
              </Link>
          }
        />
        }
        readUrlFilters
        bulkActions={['approve', 'reject', 'archive', 'delete']}
        emptyTitle="No influencers match these filters"
        emptyDescription="Try clearing the search or widening the category and location filters."
      />
    </div>
  );
}
