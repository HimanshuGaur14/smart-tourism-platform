/**
 * Adds one freely licensed photo (with credit and licence) to every published destination
 * that has none, using the destination's Wikipedia source link. Needs internet access.
 * Never replaces or deletes existing photos. Preview first with --dry-run:
 *   npm run photos:fetch -- --dry-run
 *   npm run photos:fetch
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createPrismaClient } from '../src/lib/prisma.js';
import { findPhoto } from './photos.js';

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL in .env first.');
  process.exit(1);
}
const dryRun = process.argv.includes('--dry-run');

const prisma = createPrismaClient(process.env.DATABASE_URL);
const destinations = await prisma.destination.findMany({
  where: { published: true, images: { none: {} } },
  select: { id: true, name: true, state: true, sourceUrls: true },
  orderBy: { name: 'asc' },
});

let added = 0;
for (const d of destinations) {
  const article = d.sourceUrls.find((u) => u.startsWith('https://en.wikipedia.org/wiki/'));
  if (!article) {
    console.warn(`- ${d.name}: skipped (no Wikipedia source link)`);
    continue;
  }
  try {
    const photo = await findPhoto(article);
    if ('skipped' in photo) {
      console.warn(`- ${d.name}: skipped (${photo.skipped})`);
      continue;
    }
    console.warn(`+ ${d.name}: ${photo.license}, ${photo.credit}`);
    if (!dryRun) {
      await prisma.destinationImage.create({
        data: {
          destinationId: d.id,
          position: 0,
          url: photo.url,
          alt: `${d.name}, ${d.state}`,
          credit: photo.credit,
          license: photo.license,
          sourceUrl: photo.sourceUrl,
        },
      });
    }
    added++;
  } catch (err) {
    console.warn(`! ${d.name}: ${(err as Error).message}`);
  }
  await new Promise((r) => setTimeout(r, 300)); // be polite to the Wikimedia API
}

console.warn(
  `\n${dryRun ? 'Would add' : 'Added'} ${added} photo(s); ${destinations.length - added} destination(s) without one.` +
    (dryRun ? ' Run again without --dry-run to save them.' : ''),
);
await prisma.$disconnect();
