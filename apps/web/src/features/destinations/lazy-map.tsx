import { lazy, Suspense, type ComponentProps } from 'react';
import { Skeleton } from '../../components/ui';

const DestinationMap = lazy(() => import('./destination-map'));

export function LazyDestinationMap(props: ComponentProps<typeof DestinationMap>) {
  return (
    <Suspense fallback={<Skeleton className={props.className} />}>
      <DestinationMap {...props} />
    </Suspense>
  );
}
