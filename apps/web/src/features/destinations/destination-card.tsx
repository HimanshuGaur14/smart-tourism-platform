import type { DestinationSummary } from '@smart-tourism/contracts';
import { MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Badge, Card, Skeleton, SmartImage } from '../../components/ui';
import { categoryMeta } from './categories';

export function DestinationCard({
  destination,
  distanceKm,
}: {
  destination: DestinationSummary;
  distanceKm?: number;
}) {
  const meta = categoryMeta.find((c) => c.slug === destination.category.slug);
  const Icon = meta?.icon;

  return (
    <Card className="group relative flex h-full flex-col transition-shadow hover:shadow-raised">
      <div className="relative">
        <SmartImage
          image={
            destination.image ? { src: destination.image.url, alt: destination.image.alt } : null
          }
          className="aspect-[4/3] w-full"
          fallbackLabel={destination.name}
        />
        {destination.hiddenGem && (
          <Badge tone="terracotta" className="absolute top-3 left-3 bg-terracotta-50">
            Hidden gem
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-forest-700 uppercase">
          {Icon && <Icon className="size-3.5" aria-hidden />}
          {destination.category.name}
        </p>
        <h3 className="mt-2 text-xl leading-snug">
          <Link
            to={`/destinations/${destination.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline"
          >
            {destination.name}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-charcoal-500">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {destination.district}, {destination.state}
        </p>
        {distanceKm !== undefined && (
          <p className="mt-0.5 text-xs text-charcoal-500">
            About {distanceKm} km away (straight line)
          </p>
        )}
        <p className="mt-3 line-clamp-3 text-sm text-charcoal-700">
          {destination.shortDescription}
        </p>
      </div>
    </Card>
  );
}

export function DestinationCardSkeleton() {
  return (
    <Card aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-12 w-full" />
      </div>
    </Card>
  );
}

export function DestinationGrid({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  /** Two columns at most, for narrow content areas. */
  compact?: boolean;
}) {
  return (
    <ul
      className={
        compact
          ? 'grid gap-5 sm:grid-cols-2'
          : 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }
    >
      {children}
    </ul>
  );
}
