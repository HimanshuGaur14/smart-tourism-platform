import { listingTypeSchema, type ListingType } from '@smart-tourism/contracts';
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Store } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  Container,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  SmartImage,
} from '../components/ui';
import { useStates } from '../features/destinations/api';
import { DestinationGrid } from '../features/destinations/destination-card';
import { listingTypeLabels, useListing, useListings } from '../features/marketplace/api';
import { EnquiryForm } from '../features/marketplace/enquiry-form';
import { ListingCard, SampleBadge } from '../features/marketplace/listing-card';
import { useDocumentTitle } from '../hooks/use-document-title';
import { ApiClientError } from '../lib/api-client';
import { NotFoundPage } from './not-found-page';

const PAGE_SIZE = 12;

export function MarketplacePage() {
  useDocumentTitle('Local marketplace');
  const [params, setParams] = useSearchParams();
  const type = listingTypeSchema.safeParse(params.get('type'));
  const filters = {
    q: params.get('q') ?? '',
    type: type.success ? type.data : undefined,
    state: params.get('state') ?? '',
    destination: params.get('destination') ?? '',
    page: Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1),
  };
  const [q, setQ] = useState(filters.q);
  const listings = useListings({
    q: filters.q || undefined,
    type: filters.type,
    state: filters.state || undefined,
    destination: filters.destination || undefined,
    page: filters.page,
    pageSize: PAGE_SIZE,
  });
  const states = useStates();

  function update(changes: Record<string, string | number | undefined>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === '' || (k === 'page' && v === 1)) next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  }

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() });
  };
  const meta = listings.data?.meta;
  const hasFilters = Boolean(filters.q || filters.type || filters.state || filters.destination);

  return (
    <>
      <PageHeader
        eyebrow="Local marketplace"
        title="Homestays, guides and artisans"
        description="Listed by local hosts and makers. Enquire directly; no payments are taken here."
      />
      <Container className="py-10">
        <div className="grid gap-4 rounded-card border border-charcoal-100 bg-white p-4 shadow-card md:grid-cols-[1fr_14rem_14rem] md:items-end">
          <form role="search" onSubmit={onSearch} className="flex items-end gap-2">
            <Field label="Search listings" className="flex-1">
              <Input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Homestay, weaving, Majuli…"
                maxLength={100}
              />
            </Field>
            <Button type="submit" variant="accent">
              Search
            </Button>
          </form>
          <Field label="Type">
            <Select value={filters.type ?? ''} onChange={(e) => update({ type: e.target.value })}>
              <option value="">All types</option>
              {listingTypeSchema.options.map((t) => (
                <option key={t} value={t}>
                  {listingTypeLabels[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="State or union territory">
            <Select value={filters.state} onChange={(e) => update({ state: e.target.value })}>
              <option value="">All states</option>
              {states.data?.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {filters.destination && (
          <p className="mt-4 text-sm text-charcoal-600">
            Showing listings linked to <strong>{filters.destination}</strong>.{' '}
            <button
              type="button"
              className="underline"
              onClick={() => update({ destination: undefined })}
            >
              Show all
            </button>
          </p>
        )}

        <p className="mt-8 text-sm text-charcoal-600" aria-live="polite">
          {meta
            ? `${meta.total} ${meta.total === 1 ? 'listing' : 'listings'}`
            : listings.isPending
              ? 'Loading listings…'
              : ''}
        </p>
        <div className="mt-4">
          {listings.isError ? (
            <ErrorState
              title="We couldn’t load listings"
              description={listings.error.message}
              onRetry={() => void listings.refetch()}
            />
          ) : listings.isPending ? (
            <DestinationGrid>
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <Skeleton className="h-80 w-full" />
                </li>
              ))}
            </DestinationGrid>
          ) : listings.data.data.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No listings match"
              description={
                hasFilters
                  ? 'Try a different type or remove a filter.'
                  : 'No listings have been approved yet.'
              }
              action={
                hasFilters ? (
                  <Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <DestinationGrid>
                {listings.data.data.map((l) => (
                  <li key={l.id}>
                    <ListingCard listing={l} />
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
                    onClick={() => update({ page: meta.page - 1 })}
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
                    onClick={() => update({ page: meta.page + 1 })}
                  >
                    Next <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
        <Card className="mt-12">
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-sans text-base font-semibold">
                Are you a host, guide or artisan?
              </h2>
              <p className="text-sm text-charcoal-600">
                Create a vendor account to list your services. Listings are reviewed before they go
                live.
              </p>
            </div>
            <ButtonLink to="/register" variant="secondary">
              Become a vendor
            </ButtonLink>
          </CardBody>
        </Card>
      </Container>
    </>
  );
}

export function ListingDetailPage() {
  const { slug = '' } = useParams();
  const listing = useListing(slug);
  useDocumentTitle(listing.data?.title ?? (listing.isPending ? 'Loading listing' : undefined));

  if (listing.isPending) {
    return (
      <Container className="py-10" aria-busy>
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-6 h-72 w-full" />
      </Container>
    );
  }
  if (listing.isError) {
    if (listing.error instanceof ApiClientError && listing.error.status === 404)
      return <NotFoundPage />;
    return (
      <Container className="py-16">
        <ErrorState title="We couldn’t load this listing" onRetry={() => void listing.refetch()} />
      </Container>
    );
  }

  const l = listing.data;
  const moderation = 'moderationStatus' in l ? l : null;
  const isPublic =
    !moderation || (moderation.isActive && moderation.moderationStatus === 'APPROVED');

  return (
    <article>
      <header className="border-b border-charcoal-100 bg-ivory-100">
        <Container className="py-8 sm:py-12">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1 text-sm font-medium text-forest-700 hover:text-forest-900"
          >
            <ArrowLeft className="size-4" aria-hidden /> All listings
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="forest">{listingTypeLabels[l.type as ListingType]}</Badge>
            {l.isSample && <SampleBadge />}
            {moderation && (
              <Badge tone={isPublic ? 'forest' : 'warning'}>
                {isPublic
                  ? 'Live'
                  : `Not public: ${moderation.isActive ? moderation.moderationStatus.toLowerCase() : 'inactive'}`}
              </Badge>
            )}
          </div>
          <h1 className="mt-3 text-3xl sm:text-5xl">{l.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-charcoal-600">
            <MapPin className="size-4" aria-hidden />
            {l.district}, {l.state}
            {l.destination && (
              <>
                {' · near '}
                <Link to={`/destinations/${l.destination.slug}`} className="underline">
                  {l.destination.name}
                </Link>
              </>
            )}
          </p>
        </Container>
      </header>
      <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_26rem]">
        <div className="min-w-0 space-y-6">
          <SmartImage
            image={l.imageUrl ? { src: l.imageUrl, alt: l.title } : null}
            fallbackLabel={listingTypeLabels[l.type as ListingType]}
            className="aspect-[16/9] w-full rounded-card border border-charcoal-100"
          />
          <p className="text-lg text-charcoal-700">{l.summary}</p>
          <p className="leading-relaxed whitespace-pre-line text-charcoal-700">{l.description}</p>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-charcoal-500">Listed by</dt>
              <dd className="font-medium">{l.vendor.name}</dd>
            </div>
            {l.priceInfo && (
              <div>
                <dt className="text-charcoal-500">Price</dt>
                <dd className="font-medium">{l.priceInfo}</dd>
              </div>
            )}
          </dl>
          {l.isSample && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              This is a sample listing created to demonstrate the marketplace. It is not a real
              business.
            </p>
          )}
        </div>
        <aside>
          <Card>
            <CardBody className="p-6">
              <h2 className="text-xl">Send an enquiry</h2>
              <div className="mt-4">
                {isPublic ? (
                  <EnquiryForm listingId={l.id} isSample={l.isSample} />
                ) : (
                  <p className="text-sm text-charcoal-600">
                    Enquiries open once this listing is approved and active.
                  </p>
                )}
              </div>
            </CardBody>
          </Card>
        </aside>
      </Container>
    </article>
  );
}
