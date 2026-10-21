import {
  type destinationListQuerySchema,
  type DestinationDetail,
  type DestinationSummary,
  type NearbyDestination,
  type PaginationMeta,
} from '@smart-tourism/contracts';
import type { z } from 'zod';
import type { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { distanceKm } from '../../lib/geo.js';
import type { Db } from '../../lib/prisma.js';
import { detailInclude, summaryInclude, toDetail, toSummary } from './destinations.mapper.js';

type ListQuery = z.output<typeof destinationListQuerySchema>;

const orderings: Record<ListQuery['sort'], Prisma.DestinationOrderByWithRelationInput[]> = {
  featured: [{ featured: 'desc' }, { name: 'asc' }],
  name: [{ name: 'asc' }],
  state: [{ state: 'asc' }, { name: 'asc' }],
  newest: [{ createdAt: 'desc' }, { name: 'asc' }],
};

export function createDestinationsService(db: Db) {
  return {
    async list(query: ListQuery): Promise<{ data: DestinationSummary[]; meta: PaginationMeta }> {
      const insensitive = 'insensitive' as const;
      const where: Prisma.DestinationWhereInput = {
        published: true,
        ...(query.category && { category: { slug: query.category } }),
        ...(query.state && { state: { equals: query.state, mode: insensitive } }),
        ...(query.district && { district: { equals: query.district, mode: insensitive } }),
        ...(query.featured !== undefined && { featured: query.featured }),
        ...(query.hiddenGem !== undefined && { hiddenGem: query.hiddenGem }),
        ...(query.q && {
          OR: [
            { name: { contains: query.q, mode: insensitive } },
            { state: { contains: query.q, mode: insensitive } },
            { district: { contains: query.q, mode: insensitive } },
            { shortDescription: { contains: query.q, mode: insensitive } },
            { tags: { has: query.q.toLowerCase() } },
            { category: { name: { contains: query.q, mode: insensitive } } },
          ],
        }),
      };

      const [total, rows] = await db.$transaction([
        db.destination.count({ where }),
        db.destination.findMany({
          where,
          include: summaryInclude,
          // id as a final tie-breaker keeps pagination stable.
          orderBy: [...orderings[query.sort], { id: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ]);

      return {
        data: rows.map(toSummary),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      };
    },

    async highlighted(
      kind: 'featured' | 'hidden-gems',
      limit: number,
    ): Promise<DestinationSummary[]> {
      const rows = await db.destination.findMany({
        where: {
          published: true,
          ...(kind === 'featured' ? { featured: true } : { hiddenGem: true }),
        },
        include: summaryInclude,
        orderBy: [{ name: 'asc' }],
        take: limit,
      });
      return rows.map(toSummary);
    },

    async getBySlug(slug: string): Promise<DestinationDetail> {
      const row = await db.destination.findFirst({
        where: { slug, published: true },
        include: detailInclude,
      });
      if (!row) throw AppError.notFound('Destination not found');
      return toDetail(row);
    },

    /** Nearest published destinations by straight-line distance. */
    async nearby(slug: string, limit: number, radiusKm: number): Promise<NearbyDestination[]> {
      const origin = await db.destination.findFirst({
        where: { slug, published: true },
        select: { id: true, latitude: true, longitude: true },
      });
      if (!origin) throw AppError.notFound('Destination not found');

      // The catalogue is small (tens to low hundreds of rows), so ranking in memory is fine.
      const candidates = await db.destination.findMany({
        where: { published: true, id: { not: origin.id } },
        include: summaryInclude,
      });

      return candidates
        .map((row) => ({ ...toSummary(row), distanceKm: Math.round(distanceKm(origin, row)) }))
        .filter((row) => row.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm || a.name.localeCompare(b.name))
        .slice(0, limit);
    },

    async states(): Promise<Array<{ state: string; destinationCount: number }>> {
      const groups = await db.destination.groupBy({
        by: ['state'],
        where: { published: true },
        _count: { _all: true },
        orderBy: { state: 'asc' },
      });
      return groups.map((g) => ({ state: g.state, destinationCount: g._count._all }));
    },
  };
}

export type DestinationsService = ReturnType<typeof createDestinationsService>;
