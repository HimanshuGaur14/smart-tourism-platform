import type {
  CrowdLevel,
  DestinationAnalytics,
  Footfall,
  PlatformOverview,
} from '@smart-tourism/contracts';
import type { Db } from '../../lib/prisma.js';
import {
  baseDailyVisitors,
  crowdLevelFor,
  demoDailyVisitors,
  demoMonthlyVisitors,
  expectedMonthlyVisitors,
  seasonFactor,
} from '../../services/forecast/demo-data.js';

export const DEMO_DISCLAIMER =
  'Illustrative demo data generated from seasonal patterns. These are not real visitor counts or predictions.';

const levels: CrowdLevel[] = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'];

interface Month {
  year: number;
  monthIndex: number;
  label: string;
}

function monthRange(from: string | undefined, months: number): Month[] {
  const now = new Date();
  let year: number;
  let monthIndex: number;
  if (from) {
    year = Number(from.slice(0, 4));
    monthIndex = Number(from.slice(5, 7)) - 1;
  } else {
    // Default: the last `months` months up to and including the current month.
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
    year = start.getUTCFullYear();
    monthIndex = start.getUTCMonth();
  }
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(year, monthIndex + i, 1));
    return {
      year: d.getUTCFullYear(),
      monthIndex: d.getUTCMonth(),
      label: d.toISOString().slice(0, 7),
    };
  });
}

function typicalDaily(id: string, category: string) {
  const avg =
    Array.from({ length: 12 }, (_, m) => seasonFactor(category, m)).reduce((a, b) => a + b) / 12;
  return baseDailyVisitors(id) * avg * 1.1;
}

export function createAnalyticsService(db: Db) {
  const destinations = (where: { slugs?: string[]; state?: string; category?: string } = {}) =>
    db.destination.findMany({
      where: {
        published: true,
        ...(where.slugs && { slug: { in: where.slugs } }),
        ...(where.state && { state: { equals: where.state, mode: 'insensitive' as const } }),
        ...(where.category && { category: { slug: where.category } }),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        state: true,
        category: { select: { slug: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

  return {
    /** Real counts from the database. Contains no visitor numbers. */
    async overview(forecastKind: 'demo' | 'http'): Promise<PlatformOverview> {
      const since = new Date(Date.now() - 30 * 86_400_000);
      const [
        published,
        unpublished,
        approvedActive,
        pending,
        sample,
        total,
        recent,
        tourists,
        vendors,
      ] = await db.$transaction([
        db.destination.count({ where: { published: true } }),
        db.destination.count({ where: { published: false } }),
        db.vendorListing.count({ where: { isActive: true, moderationStatus: 'APPROVED' } }),
        db.vendorListing.count({ where: { moderationStatus: 'PENDING' } }),
        db.vendorListing.count({ where: { isSample: true } }),
        db.enquiry.count(),
        db.enquiry.count({ where: { createdAt: { gte: since } } }),
        db.user.count({ where: { role: 'TOURIST' } }),
        db.user.count({ where: { role: 'VENDOR' } }),
      ]);
      return {
        destinations: { published, unpublished },
        listings: { approvedActive, pending, sample },
        enquiries: { total, last30Days: recent },
        users: { tourists, vendors },
        forecastSource: forecastKind === 'http' ? 'MODEL' : 'DEMO',
      };
    },

    async footfall(opts: { slugs?: string[]; from?: string; months: number }): Promise<Footfall> {
      const rows = await destinations(opts.slugs ? { slugs: opts.slugs } : {});
      const selected = opts.slugs
        ? rows
        : rows.filter((_, i) => i % Math.ceil(rows.length / 4) === 0).slice(0, 4);
      const months = monthRange(opts.from, opts.months);
      const series = selected.map((d) => ({
        destination: { slug: d.slug, name: d.name, state: d.state },
        points: months.map((m) => ({
          month: m.label,
          visitors: demoMonthlyVisitors(d.id, d.category.slug, m.year, m.monthIndex),
        })),
      }));
      const seasonality = Array.from({ length: 12 }, (_, m) => {
        const avg =
          selected.reduce((sum, d) => sum + seasonFactor(d.category.slug, m), 0) /
          Math.max(selected.length, 1);
        return { month: m + 1, index: Math.round(avg * 100) / 100 };
      });
      return {
        source: 'DEMO',
        disclaimer: DEMO_DISCLAIMER,
        months: months.map((m) => m.label),
        series,
        seasonality,
      };
    },

    async destinationInsights(opts: {
      state?: string;
      category?: string;
    }): Promise<DestinationAnalytics> {
      const rows = await destinations(opts);
      const today = new Date();
      const last12 = monthRange(undefined, 12);

      const insights = rows.map((d) => {
        const monthly = last12.map((m) =>
          demoMonthlyVisitors(d.id, d.category.slug, m.year, m.monthIndex),
        );
        const peakMonth = Array.from({ length: 12 }, (_, m) =>
          seasonFactor(d.category.slug, m),
        ).reduce((best, v, i, arr) => (v > arr[best]! ? i : best), 0);
        return {
          destination: { slug: d.slug, name: d.name, state: d.state, category: d.category.name },
          visitorsLast12Months: monthly.reduce((a, b) => a + b, 0),
          peakMonth: peakMonth + 1,
          currentCrowdLevel: crowdLevelFor(
            demoDailyVisitors(d.id, d.category.slug, today),
            typicalDaily(d.id, d.category.slug),
          ),
          categorySlug: d.category.slug,
        };
      });

      const crowdDistribution = levels.map((level) => ({
        level,
        count: insights.filter((i) => i.currentCrowdLevel === level).length,
      }));

      const anomalies = rows
        .flatMap((d) =>
          last12.map((m) => {
            const visitors = demoMonthlyVisitors(d.id, d.category.slug, m.year, m.monthIndex);
            const expected = expectedMonthlyVisitors(d.id, d.category.slug, m.year, m.monthIndex);
            const deviationPct = Math.round(((visitors - expected) / expected) * 100);
            return {
              destination: { slug: d.slug, name: d.name },
              month: m.label,
              visitors,
              expected,
              deviationPct,
              kind: deviationPct > 0 ? ('SPIKE' as const) : ('DROP' as const),
            };
          }),
        )
        .filter((a) => Math.abs(a.deviationPct) >= 35)
        .sort(
          (a, b) =>
            b.month.localeCompare(a.month) || Math.abs(b.deviationPct) - Math.abs(a.deviationPct),
        )
        .slice(0, 8);

      const busy = insights.filter(
        (i) => i.currentCrowdLevel === 'HIGH' || i.currentCrowdLevel === 'VERY_HIGH',
      );
      const alternatives = busy.slice(0, 6).map((b) => ({
        for: {
          slug: b.destination.slug,
          name: b.destination.name,
          crowdLevel: b.currentCrowdLevel,
        },
        suggestions: insights
          .filter(
            (i) =>
              i.categorySlug === b.categorySlug &&
              i.destination.slug !== b.destination.slug &&
              (i.currentCrowdLevel === 'LOW' || i.currentCrowdLevel === 'MODERATE'),
          )
          .slice(0, 3)
          .map((i) => ({
            slug: i.destination.slug,
            name: i.destination.name,
            state: i.destination.state,
            crowdLevel: i.currentCrowdLevel,
          })),
      }));

      return {
        source: 'DEMO',
        disclaimer: DEMO_DISCLAIMER,
        insights: insights.map(({ categorySlug: _c, ...rest }) => rest),
        crowdDistribution,
        anomalies,
        alternatives,
      };
    },
  };
}
export type AnalyticsService = ReturnType<typeof createAnalyticsService>;
