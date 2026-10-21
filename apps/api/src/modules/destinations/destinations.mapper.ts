import type {
  DestinationDetail,
  DestinationImage,
  DestinationSummary,
} from '@smart-tourism/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

export const summaryInclude = {
  category: { select: { slug: true, name: true } },
  images: { orderBy: { position: 'asc' }, take: 1 },
} satisfies Prisma.DestinationInclude;

export const detailInclude = {
  category: { select: { slug: true, name: true } },
  images: { orderBy: { position: 'asc' } },
} satisfies Prisma.DestinationInclude;

type SummaryRow = Prisma.DestinationGetPayload<{ include: typeof summaryInclude }>;
type DetailRow = Prisma.DestinationGetPayload<{ include: typeof detailInclude }>;
type ImageRow = SummaryRow['images'][number];

function toImage(image: ImageRow): DestinationImage {
  return {
    url: image.url,
    alt: image.alt,
    credit: image.credit,
    license: image.license,
    sourceUrl: image.sourceUrl,
  };
}

export function toSummary(row: SummaryRow): DestinationSummary {
  const first = row.images[0];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    state: row.state,
    district: row.district,
    category: row.category as DestinationSummary['category'],
    shortDescription: row.shortDescription,
    latitude: row.latitude,
    longitude: row.longitude,
    coordinatesVerified: row.coordinatesVerified,
    tags: row.tags,
    featured: row.featured,
    hiddenGem: row.hiddenGem,
    image: first ? toImage(first) : null,
  };
}

export function toDetail(row: DetailRow): DestinationDetail {
  return {
    ...toSummary(row),
    description: row.description,
    images: row.images.map(toImage),
    bestTimeToVisit: row.bestTimeToVisit,
    responsibleTips: row.responsibleTips,
    sourceUrls: row.sourceUrls,
    updatedAt: row.updatedAt.toISOString(),
  };
}
