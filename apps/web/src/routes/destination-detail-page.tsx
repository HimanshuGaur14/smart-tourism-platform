import { ForecastPanel } from '../features/analytics/forecast-panel';
import { listingTypeLabels, useListings } from '../features/marketplace/api';
import { SampleBadge } from '../features/marketplace/listing-card';
import { SaveDestinationButton } from '../features/trips/save-button';
import { useDocumentTitle } from '../hooks/use-document-title';
import { ArrowLeft, CalendarRange, ExternalLink, Leaf, MapPin, Store } from 'lucide-react';
import { Link, useParams } from 'react-router';
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  Container,
  EmptyState,
  ErrorState,
  Skeleton,
  SmartImage,
} from '../components/ui';
import { useDestination, useNearbyDestinations } from '../features/destinations/api';
import { DestinationCard, DestinationGrid } from '../features/destinations/destination-card';
import { LazyDestinationMap } from '../features/destinations/lazy-map';
import { ApiClientError } from '../lib/api-client';
import { NotFoundPage } from './not-found-page';

function DetailSkeleton() {
  return (
    <Container className="py-10" aria-busy>
      <span className="sr-only" role="status">
        Loading destination
      </span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-12 w-2/3" />
      <Skeleton className="mt-8 aspect-[21/9] w-full" />
    </Container>
  );
}

export function DestinationDetailPage() {
  const { slug = '' } = useParams();
  const destination = useDestination(slug);
  const nearby = useNearbyDestinations(slug, destination.isSuccess);
  useDocumentTitle(
    destination.data?.name ?? (destination.isPending ? 'Loading destination' : undefined),
  );

  if (destination.isPending) return <DetailSkeleton />;
  if (destination.isError) {
    const { error } = destination;
    if (error instanceof ApiClientError && (error.status === 404 || error.status === 400)) {
      return <NotFoundPage />;
    }
    return (
      <Container className="py-16">
        <ErrorState
          title="We couldn’t load this destination"
          description={error.message}
          onRetry={() => void destination.refetch()}
        />
      </Container>
    );
  }

  const d = destination.data;
  const hero = d.images[0];

  return (
    <article>
      <header className="border-b border-charcoal-100 bg-ivory-100">
        <Container className="py-8 sm:py-12">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1 text-sm font-medium text-forest-700 hover:text-forest-900"
          >
            <ArrowLeft className="size-4" aria-hidden /> All destinations
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="forest">{d.category.name}</Badge>
            {d.hiddenGem && <Badge tone="terracotta">Hidden gem</Badge>}
          </div>
          <h1 className="mt-3 text-4xl sm:text-5xl">{d.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-charcoal-600">
            <MapPin className="size-4" aria-hidden />
            {d.district} district, {d.state}
          </p>
          <p className="mt-4 max-w-3xl text-lg text-charcoal-700">{d.shortDescription}</p>
          <div className="mt-6">
            <SaveDestinationButton slug={d.slug} name={d.name} />
          </div>
        </Container>
      </header>

      <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-10">
          <figure>
            <SmartImage
              image={
                hero
                  ? {
                      src: hero.url,
                      alt: hero.alt,
                      credit: hero.credit ?? undefined,
                      license: hero.license ?? undefined,
                      sourceUrl: hero.sourceUrl ?? undefined,
                    }
                  : null
              }
              fallbackLabel={d.name}
              showCredit
              className="aspect-[16/9] w-full rounded-card border border-charcoal-100"
            />
            {!hero && (
              <figcaption className="mt-2 text-xs text-charcoal-500">
                No verified photo has been added for this destination yet.
              </figcaption>
            )}
          </figure>

          <section aria-labelledby="about">
            <h2 id="about" className="text-2xl">
              About {d.name}
            </h2>
            <p className="mt-3 leading-relaxed text-charcoal-700">{d.description}</p>
            {d.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tags">
                {d.tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      to={`/explore?q=${encodeURIComponent(tag)}`}
                      className="rounded-full border border-charcoal-200 bg-white px-3 py-1 text-sm text-charcoal-700 hover:border-forest-300"
                    >
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="responsible">
            <h2 id="responsible" className="flex items-center gap-2 text-2xl">
              <Leaf className="size-5 text-forest-600" aria-hidden /> Travel responsibly
            </h2>
            <ul className="mt-4 space-y-2">
              {d.responsibleTips.map((tip) => (
                <li key={tip} className="flex gap-3 text-charcoal-700">
                  <span
                    aria-hidden
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-terracotta-400"
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="location">
            <h2 id="location" className="text-2xl">
              Location
            </h2>
            <LazyDestinationMap
              destinations={[d]}
              focus={d}
              className="mt-4 h-80 w-full rounded-card border border-charcoal-100"
            />
            <p className="mt-2 text-xs text-charcoal-500">
              {d.coordinatesVerified
                ? 'Location checked against the sources below.'
                : 'Approximate location. Confirm directions locally before you travel.'}
            </p>
          </section>

          <section aria-labelledby="nearby">
            <h2 id="nearby" className="text-2xl">
              Nearby destinations
            </h2>
            <p className="mt-1 text-sm text-charcoal-500">
              Straight-line distance, not road distance.
            </p>
            <div className="mt-5">
              {nearby.isError ? (
                <ErrorState
                  title="Couldn’t load nearby places"
                  onRetry={() => void nearby.refetch()}
                />
              ) : nearby.isPending ? (
                <Skeleton className="h-40 w-full" />
              ) : nearby.data.length === 0 ? (
                <EmptyState title="No other destinations nearby yet" />
              ) : (
                <DestinationGrid compact>
                  {nearby.data.map((n) => (
                    <li key={n.id}>
                      <DestinationCard destination={n} distanceKm={n.distanceKm} />
                    </li>
                  ))}
                </DestinationGrid>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardBody className="space-y-4">
              <h2 className="font-sans text-sm font-semibold text-charcoal-900">At a glance</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-charcoal-500">State / UT</dt>
                  <dd className="font-medium">{d.state}</dd>
                </div>
                <div>
                  <dt className="text-charcoal-500">District</dt>
                  <dd className="font-medium">{d.district}</dd>
                </div>
                {d.bestTimeToVisit && (
                  <div>
                    <dt className="flex items-center gap-1 text-charcoal-500">
                      <CalendarRange className="size-3.5" aria-hidden /> Best time to visit
                    </dt>
                    <dd className="font-medium">{d.bestTimeToVisit}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <ForecastPanel slug={d.slug} />
              <Link
                to="/intelligence"
                className="mt-3 inline-block text-sm text-forest-700 underline"
              >
                Open the intelligence dashboard
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="flex items-center gap-2 font-sans text-sm font-semibold text-charcoal-900">
                <Store className="size-4" aria-hidden /> Local hosts and artisans
              </h2>
              <NearbyListings slug={d.slug} />
            </CardBody>
          </Card>

          {d.sourceUrls.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="font-sans text-sm font-semibold text-charcoal-900">Sources</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {d.sourceUrls.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 break-all text-forest-700 underline hover:text-forest-900"
                      >
                        {decodeURIComponent(new URL(url).pathname.split('/').pop() ?? url).replace(
                          /_/g,
                          ' ',
                        )}
                        <ExternalLink className="size-3 shrink-0" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </aside>
      </Container>
    </article>
  );
}

function NearbyListings({ slug }: { slug: string }) {
  const { data, isPending, isError } = useListings({ destination: slug, pageSize: 3 });
  if (isPending) return <Skeleton className="mt-3 h-16" />;
  if (isError)
    return <p className="mt-3 text-sm text-charcoal-600">Listings could not be loaded.</p>;
  return (
    <>
      {data.data.length === 0 ? (
        <p className="mt-3 text-sm text-charcoal-600">No listings for this destination yet.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {data.data.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2">
              <Link to={`/marketplace/${l.slug}`} className="font-medium text-forest-700 underline">
                {l.title}
              </Link>
              <span className="text-charcoal-500">{listingTypeLabels[l.type]}</span>
              {l.isSample && <SampleBadge />}
            </li>
          ))}
        </ul>
      )}
      <ButtonLink
        to={`/marketplace?destination=${slug}`}
        variant="secondary"
        size="sm"
        className="mt-4"
      >
        Browse the marketplace
      </ButtonLink>
    </>
  );
}
