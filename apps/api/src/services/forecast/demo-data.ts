import type { CrowdLevel } from '@smart-tourism/contracts';

/**
 * Deterministic generator for ILLUSTRATIVE visitor numbers. These are not real data and
 * not predictions: they exist so the dashboard can be built and demonstrated before real
 * footfall data or the ML model is available. Same inputs always give the same output.
 */

/** FNV-1a string hash → 32-bit unsigned int. */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic pseudo-random number in [0, 1). */
export const unit = (key: string) => hash(key) / 0x1_0000_0000;

/** Relative demand by month (index 0 = January) for each category; illustrative shapes. */
const SEASON: Record<string, number[]> = {
  waterfalls: [0.6, 0.55, 0.5, 0.45, 0.5, 0.9, 1.5, 1.7, 1.6, 1.4, 1.0, 0.75],
  mountains: [0.6, 0.7, 0.9, 1.2, 1.6, 1.6, 0.8, 0.7, 0.9, 1.3, 1.0, 0.8],
  heritage: [1.4, 1.3, 1.1, 0.8, 0.6, 0.55, 0.6, 0.65, 0.8, 1.2, 1.4, 1.5],
  wildlife: [1.4, 1.4, 1.3, 1.2, 1.0, 0.6, 0.3, 0.3, 0.5, 1.0, 1.4, 1.5],
  beaches: [1.5, 1.4, 1.2, 1.0, 0.8, 0.5, 0.5, 0.5, 0.7, 1.0, 1.3, 1.6],
  spirituality: [1.3, 1.2, 1.1, 0.9, 0.8, 0.7, 0.8, 0.8, 0.9, 1.2, 1.3, 1.2],
  culture: [1.3, 1.2, 1.0, 0.8, 0.7, 0.7, 0.8, 0.8, 0.9, 1.2, 1.3, 1.3],
  nature: [1.2, 1.1, 1.0, 0.9, 0.9, 0.8, 0.9, 1.0, 1.0, 1.2, 1.1, 1.1],
  adventure: [0.6, 0.7, 1.0, 1.3, 1.4, 1.1, 0.7, 0.7, 1.1, 1.4, 1.2, 0.8],
};

export function seasonFactor(category: string, monthIndex: number): number {
  return (SEASON[category] ?? SEASON.nature!)[monthIndex]!;
}

/** Illustrative average daily visitors for a destination (between ~300 and ~6,300). */
export function baseDailyVisitors(destinationId: string): number {
  return Math.round(300 + unit(`base:${destinationId}`) * 6000);
}

export function crowdLevelFor(visitors: number, typicalDaily: number): CrowdLevel {
  const ratio = visitors / typicalDaily;
  if (ratio < 0.7) return 'LOW';
  if (ratio < 1.1) return 'MODERATE';
  if (ratio < 1.5) return 'HIGH';
  return 'VERY_HIGH';
}

export function demoDailyVisitors(destinationId: string, category: string, date: Date): number {
  const base = baseDailyVisitors(destinationId);
  const day = date.getUTCDay();
  const weekend = day === 0 || day === 6 ? 1.35 : 1;
  const noise = 0.85 + unit(`day:${destinationId}:${date.toISOString().slice(0, 10)}`) * 0.3;
  return Math.round(base * seasonFactor(category, date.getUTCMonth()) * weekend * noise);
}

/** Expected (noise-free) monthly visitors, used as the baseline for anomaly flags. */
export function expectedMonthlyVisitors(
  destinationId: string,
  category: string,
  year: number,
  monthIndex: number,
): number {
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.round(
    baseDailyVisitors(destinationId) * seasonFactor(category, monthIndex) * days * 1.1,
  );
}

/**
 * Illustrative monthly totals. About 1 in 12 destination-months gets an injected spike or
 * drop so the anomaly panel has something to show; these are flagged as demo like the rest.
 */
export function demoMonthlyVisitors(
  destinationId: string,
  category: string,
  year: number,
  monthIndex: number,
): number {
  const expected = expectedMonthlyVisitors(destinationId, category, year, monthIndex);
  const key = `${destinationId}:${year}-${monthIndex}`;
  const noise = 0.9 + unit(`month:${key}`) * 0.2;
  const shock = unit(`shock:${key}`);
  const anomaly = shock < 0.04 ? 0.5 : shock > 0.96 ? 1.6 : 1;
  return Math.round(expected * noise * anomaly);
}
