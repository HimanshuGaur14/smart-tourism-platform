import { useDocumentTitle } from '../hooks/use-document-title';
import {
  destinationCategorySlugSchema,
  destinationSortSchema,
  type DestinationListQuery,
} from '@smart-tourism/contracts';
import { ChevronLeft, ChevronRight, LayoutGrid, Map as MapIcon, X } from 'lucide-react';
import { useSearchParams } from 'react-router';
import {
  Button,
  Container,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  Select,
} from '../components/ui';
import { useCategories, useDestinations, useStates } from '../features/destinations/api';
import { categoryMeta } from '../features/destinations/categories';
import {
  DestinationCard,
  DestinationCardSkeleton,
  DestinationGrid,
} from '../features/destinations/destination-card';
import { DestinationSearchForm } from '../features/destinations/destination-search-form';
import { LazyDestinationMap } from '../features/destinations/lazy-map';
import { cn } from '../lib/cn';

const PAGE_SIZE = 12;
const sortLabels = {
  featured: 'Featured first',
  name: 'Name (A–Z)',
  state: 'State',
  newest: 'Newest',
};

/** Reads filters from the URL, ignoring anything invalid so a bad link never breaks the page. */
function useExploreParams() {
  const [params, setParams] = useSearchParams();
  const category = destinationCategorySlugSchema.safeParse(params.get('category'));
  const sort = destinationSortSchema.safeParse(params.get('sort'));
  const page = Number.parseInt(params.get('page') ?? '1', 10);

  const filters = {
    q: params.get('q') ?? '',
    state: params.get('state') ?? '',
    category: category.success ? category.data : undefined,
    sort: sort.success ? sort.data : 'featured',
    page: Number.isFinite(page) && page > 0 ? page : 1,
    hiddenGem: params.get('hiddenGem') === 'true',
    view: params.get('view') === 'map' ? 'map' : 'list',
  } as const;

  function update(changes: Record<string, string | number | undefined>, resetPage = true) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === '' || value === 'featured' || value === 'list')
        next.delete(key);
      else next.set(key, String(value));
    }
    if (resetPage && !('page' in changes)) next.delete('page');
    if (next.get('page') === '1') next.delete('page');
    setParams(next);
  }

  return { filters, update };
}

export function ExplorePage() {
  useDocumentTitle('Explore India');
  const { filters, update } = useExploreParams();
  const isMap = filters.view === 'map';
  const query: DestinationListQuery = {
    q: filters.q || undefined,
    state: filters.state || undefined,
    category: filters.category,
    hiddenGem: filters.hiddenGem || undefined,
    sort: filters.sort,
    // The map shows every match on one page (the API caps pageSize at 50).
    page: isMap ? 1 : filters.page,
    pageSize: isMap ? 50 : PAGE_SIZE,
  };

  const destinations = useDestinations(query);
  const states = useStates();
  const categories = useCategories();
  const counts = new Map(categories.data?.map((c) => [c.slug, c.destinationCount]));
  const hasFilters = Boolean(filters.q || filters.state || filters.category || filters.hiddenGem);
  const clearFilters = () =>
    update({ q: undefined, state: undefined, category: undefined, hiddenGem: undefined });
  const meta = destinations.data?.meta;

  return (
    <>
      <PageHeader
        eyebrow="Explore India"
        title="Find your next destination"
        description="Search by destination, state, district or keyword, and filter by what you love."
      />
      <Container className="py-10">
        <div className="space-y-4 rounded-card border border-charcoal-100 bg-white p-4 shadow-card">
          <DestinationSearchForm
            key={filters.q}
            initialQuery={filters.q}
            size="md"
            preserveParams
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="State or union territory">
              <Select value={filters.state} onChange={(e) => update({ state: e.target.value })}>
                <option value="">All states</option>
                {states.data?.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.state} ({s.destinationCount})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category">
              <Select
                value={filters.category ?? ''}
                onChange={(e) => update({ category: e.target.value })}
              >
                <option value="">All categories</option>
                {categoryMeta.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                    {counts.has(c.slug) ? ` (${counts.get(c.slug)})` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sort by">
              <Select value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
                {destinationSortSchema.options.map((s) => (
                  <option key={s} value={s}>
                    {sortLabels[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-charcoal-700">
            <input
              type="checkbox"
              checked={filters.hiddenGem}
              onChange={(e) => update({ hiddenGem: e.target.checked ? 'true' : undefined })}
              className="size-4 accent-forest-700"
            />
            Hidden gems only
          </label>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="text-sm text-charcoal-600" aria-live="polite">
              {meta
                ? `${meta.total} ${meta.total === 1 ? 'destination' : 'destinations'}`
                : destinations.isPending
                  ? 'Loading destinations…'
                  : ''}
            </p>
            {hasFilters && meta && (
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<X className="size-4" aria-hidden />}
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
          <div
            role="group"
            aria-label="View"
            className="inline-flex rounded-md border border-charcoal-200 bg-white p-0.5"
          >
            {(
              [
                ['list', 'Grid', LayoutGrid],
                ['map', 'Map', MapIcon],
              ] as const
            ).map(([view, label, Icon]) => (
              <button
                key={view}
                type="button"
                aria-pressed={filters.view === view}
                onClick={() => update({ view }, false)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium',
                  filters.view === view
                    ? 'bg-forest-700 text-ivory-50'
                    : 'text-charcoal-600 hover:bg-ivory-200',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          {destinations.isError ? (
            <ErrorState
              title="We couldn’t load destinations"
              description={destinations.error.message}
              onRetry={() => void destinations.refetch()}
            />
          ) : destinations.isPending ? (
            <DestinationGrid>
              {Array.from({ length: 8 }, (_, i) => (
                <li key={i}>
                  <DestinationCardSkeleton />
                </li>
              ))}
            </DestinationGrid>
          ) : destinations.data.data.length === 0 ? (
            <EmptyState
              title="No destinations match your search"
              description="Try a different keyword or remove a filter."
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : isMap ? (
            <div>
              <LazyDestinationMap
                destinations={destinations.data.data}
                className="h-[32rem] w-full rounded-card border border-charcoal-100"
              />
              <p className="mt-2 text-xs text-charcoal-500">
                Marker positions are approximate unless a destination page says they are verified.
              </p>
            </div>
          ) : (
            <div className={cn(destinations.isPlaceholderData && 'opacity-60 transition-opacity')}>
              <DestinationGrid>
                {destinations.data.data.map((d) => (
                  <li key={d.id}>
                    <DestinationCard destination={d} />
                  </li>
                ))}
              </DestinationGrid>
              {meta && meta.totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-10 flex items-center justify-center gap-3"
                >
                  <Button
                    variant="secondary"
                    disabled={meta.page <= 1}
                    onClick={() => update({ page: meta.page - 1 }, false)}
                    leadingIcon={<ChevronLeft className="size-4" aria-hidden />}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-charcoal-600">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => update({ page: meta.page + 1 }, false)}
                  >
                    Next <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </nav>
              )}
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
