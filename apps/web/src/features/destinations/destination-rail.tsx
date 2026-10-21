import { Compass } from 'lucide-react';
import { EmptyState, ErrorState } from '../../components/ui';
import { useHighlightedDestinations } from './api';
import { DestinationCard, DestinationCardSkeleton, DestinationGrid } from './destination-card';

/** Featured or hidden-gem destinations from the API, with all four data states. */
export function DestinationRail({
  kind,
  limit = 4,
}: {
  kind: 'featured' | 'hidden-gems';
  limit?: number;
}) {
  const { data, isPending, isError, refetch } = useHighlightedDestinations(kind, limit);

  if (isError) {
    return (
      <ErrorState
        title="We couldn’t load destinations"
        description="Please check your connection and try again."
        onRetry={() => void refetch()}
      />
    );
  }
  if (isPending) {
    return (
      <DestinationGrid>
        {Array.from({ length: limit }, (_, i) => (
          <li key={i}>
            <DestinationCardSkeleton />
          </li>
        ))}
      </DestinationGrid>
    );
  }
  if (data.length === 0) {
    return <EmptyState icon={Compass} title="Nothing to show yet" description="Check back soon." />;
  }
  return (
    <DestinationGrid>
      {data.map((d) => (
        <li key={d.id}>
          <DestinationCard destination={d} />
        </li>
      ))}
    </DestinationGrid>
  );
}
