import { randomBytes } from 'node:crypto';

/** URL slug from a title plus a short random suffix so it is unique without a lookup loop. */
export function slugWithSuffix(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base || 'listing'}-${randomBytes(3).toString('hex')}`;
}
