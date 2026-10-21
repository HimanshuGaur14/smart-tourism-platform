/**
 * Repeatable seed: upserts categories and destinations by slug.
 * It never deletes rows, so it is safe to re-run and does not touch user data.
 * Run with: npm run db:seed
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { hash } from 'argon2';
import { createPrismaClient } from '../src/lib/prisma.js';
import { categories } from './seed-data/categories.js';
import { destinations } from './seed-data/destinations.js';
import { sampleListings } from './seed-data/listings.js';

/** Placeholder owner of sample listings. Its password is random and never stored, so nobody can log in. */
const SAMPLE_VENDOR_EMAIL = 'sample-vendor@example.invalid';

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
  process.exit(1);
}

const prisma = createPrismaClient(url);

async function main() {
  const categoryIds = new Map<string, string>();
  for (const [index, category] of categories.entries()) {
    const row = await prisma.destinationCategory.upsert({
      where: { slug: category.slug },
      create: { ...category, sortOrder: index },
      update: { name: category.name, description: category.description, sortOrder: index },
    });
    categoryIds.set(category.slug, row.id);
  }

  for (const { category, featured = false, hiddenGem = false, ...destination } of destinations) {
    const categoryId = categoryIds.get(category);
    if (!categoryId) throw new Error(`Unknown category ${category} for ${destination.slug}`);
    const data = { ...destination, categoryId, featured, hiddenGem };
    await prisma.destination.upsert({
      where: { slug: destination.slug },
      create: data,
      // Keep `published` and `coordinatesVerified` as admins may have changed them.
      update: data,
    });
  }

  const sampleVendor = await prisma.user.upsert({
    where: { email: SAMPLE_VENDOR_EMAIL },
    update: {},
    create: {
      email: SAMPLE_VENDOR_EMAIL,
      name: 'Sample vendor (demo)',
      role: 'VENDOR',
      passwordHash: await hash(randomBytes(32).toString('hex')),
    },
  });

  for (const { destinationSlug, ...listing } of sampleListings) {
    const destination = await prisma.destination.findUniqueOrThrow({
      where: { slug: destinationSlug },
      select: { id: true, state: true, district: true },
    });
    const data = {
      ...listing,
      priceInfo: listing.priceInfo ?? null,
      state: destination.state,
      district: destination.district,
      destinationId: destination.id,
      vendorId: sampleVendor.id,
      isSample: true,
    };
    await prisma.vendorListing.upsert({
      where: { slug: listing.slug },
      create: { ...data, moderationStatus: 'APPROVED' },
      // Keep moderation and active state, which an admin may have changed.
      update: data,
    });
  }

  // eslint-disable-next-line no-console -- CLI output
  console.log(
    `Seeded ${categories.length} categories, ${destinations.length} destinations and ${sampleListings.length} sample listings.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
