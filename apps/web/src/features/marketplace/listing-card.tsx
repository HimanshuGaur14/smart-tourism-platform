import type { Listing } from '@smart-tourism/contracts';
import { MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { Badge, Card, SmartImage } from '../../components/ui';
import { listingTypeLabels } from './api';

export function SampleBadge() {
  return (
    <Badge tone="warning" title="An illustrative listing, not a real business">
      Sample listing
    </Badge>
  );
}

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Card className="group relative flex h-full flex-col transition-shadow hover:shadow-raised">
      <SmartImage
        image={listing.imageUrl ? { src: listing.imageUrl, alt: listing.title } : null}
        fallbackLabel={listingTypeLabels[listing.type]}
        className="aspect-[16/10] w-full"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="forest">{listingTypeLabels[listing.type]}</Badge>
          {listing.isSample && <SampleBadge />}
        </div>
        <h3 className="mt-3 text-lg leading-snug">
          <Link
            to={`/marketplace/${listing.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline"
          >
            {listing.title}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-charcoal-500">
          <MapPin className="size-3.5" aria-hidden />
          {listing.destination ? `${listing.destination.name}, ` : `${listing.district}, `}
          {listing.state}
        </p>
        <p className="mt-3 line-clamp-3 text-sm text-charcoal-700">{listing.summary}</p>
      </div>
    </Card>
  );
}
