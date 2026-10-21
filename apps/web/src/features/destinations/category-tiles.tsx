import { Link } from 'react-router';
import { ErrorState, Skeleton } from '../../components/ui';
import { useCategories } from './api';
import { categoryMeta } from './categories';

/** Category grid built from the API (names and live counts); icons come from the UI map. */
export function CategoryTiles() {
  const { data, isPending, isError, refetch } = useCategories();

  if (isError) {
    return (
      <ErrorState
        title="We couldn’t load categories"
        description="Please check your connection and try again."
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy={isPending || undefined}>
      {isPending
        ? Array.from({ length: 9 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-32 w-full" />
            </li>
          ))
        : data.map((category) => {
            const meta = categoryMeta.find((m) => m.slug === category.slug);
            const Icon = meta?.icon;
            return (
              <li key={category.slug}>
                <Link
                  to={`/explore?category=${category.slug}`}
                  className="group flex h-full flex-col rounded-lg border border-charcoal-100 bg-white p-4 transition-colors hover:border-forest-300 hover:bg-forest-50/40"
                >
                  {Icon && <Icon className="size-6 text-forest-600" aria-hidden />}
                  <span className="mt-3 flex items-baseline justify-between gap-2">
                    <span className="font-medium text-charcoal-900">{category.name}</span>
                    <span className="text-xs text-charcoal-500">
                      {category.destinationCount}{' '}
                      {category.destinationCount === 1 ? 'place' : 'places'}
                    </span>
                  </span>
                  <span className="mt-1 text-sm text-charcoal-500">
                    {meta?.blurb ?? category.description}
                  </span>
                </Link>
              </li>
            );
          })}
    </ul>
  );
}
