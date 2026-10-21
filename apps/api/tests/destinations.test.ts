import {
  apiErrorSchema,
  categoryListResponseSchema,
  destinationArrayResponseSchema,
  destinationDetailResponseSchema,
  destinationListResponseSchema,
  nearbyResponseSchema,
  stateListResponseSchema,
} from '@smart-tourism/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { destinations as seedDestinations } from '../prisma/seed-data/destinations.js';
import { makeTestApp, testDb } from './helpers.js';

const app = makeTestApp();
const list = (query = '') => request(app).get(`/api/v1/destinations${query}`);

describe('GET /api/v1/destinations', () => {
  it('returns the first page of published destinations with pagination meta', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    const body = destinationListResponseSchema.parse(res.body);
    expect(body.data).toHaveLength(12);
    expect(body.meta).toEqual({
      page: 1,
      pageSize: 12,
      total: seedDestinations.length,
      totalPages: Math.ceil(seedDestinations.length / 12),
    });
    // Default sort puts featured destinations first.
    expect(body.data[0]?.featured).toBe(true);
  });

  it('paginates without overlaps', async () => {
    const a = destinationListResponseSchema.parse(
      (await list('?pageSize=5&page=1&sort=name')).body,
    );
    const b = destinationListResponseSchema.parse(
      (await list('?pageSize=5&page=2&sort=name')).body,
    );
    const ids = new Set([...a.data, ...b.data].map((d) => d.id));
    expect(ids.size).toBe(10);
    expect(a.data.map((d) => d.name)).toEqual([...a.data.map((d) => d.name)].sort());
  });

  it('returns an empty page past the end', async () => {
    const body = destinationListResponseSchema.parse((await list('?page=999')).body);
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(seedDestinations.length);
  });

  it('filters by state (case-insensitive) and category', async () => {
    const body = destinationListResponseSchema.parse(
      (await list('?state=jharkhand&pageSize=50')).body,
    );
    const expected = seedDestinations.filter((d) => d.state === 'Jharkhand').length;
    expect(body.meta.total).toBe(expected);
    expect(body.data.every((d) => d.state === 'Jharkhand')).toBe(true);

    const waterfalls = destinationListResponseSchema.parse(
      (await list('?state=Jharkhand&category=waterfalls')).body,
    );
    expect(waterfalls.data.map((d) => d.slug).sort()).toEqual(['dassam-falls', 'hundru-falls']);
  });

  it('searches names, districts and tags', async () => {
    const byName = destinationListResponseSchema.parse((await list('?q=ziro')).body);
    expect(byName.data.map((d) => d.slug)).toContain('ziro-valley');

    const byDistrict = destinationListResponseSchema.parse((await list('?q=Latehar')).body);
    expect(byDistrict.data.map((d) => d.slug).sort()).toEqual(['betla-national-park', 'netarhat']);

    const byTag = destinationListResponseSchema.parse((await list('?q=unesco&pageSize=50')).body);
    expect(byTag.data.map((d) => d.slug)).toEqual(expect.arrayContaining(['hampi', 'dholavira']));
  });

  it('filters hidden gems', async () => {
    const body = destinationListResponseSchema.parse(
      (await list('?hiddenGem=true&pageSize=50')).body,
    );
    expect(body.meta.total).toBe(seedDestinations.filter((d) => d.hiddenGem).length);
    expect(body.data.every((d) => d.hiddenGem)).toBe(true);
  });

  it('returns an empty result for searches with no matches', async () => {
    const body = destinationListResponseSchema.parse((await list('?q=zzzz-no-match')).body);
    expect(body.data).toEqual([]);
    expect(body.meta.totalPages).toBe(0);
  });

  it.each([
    ['?page=0', 'page'],
    ['?pageSize=500', 'pageSize'],
    ['?category=desert', 'category'],
    ['?sort=random', 'sort'],
    ['?featured=yes', 'featured'],
    [`?q=${'a'.repeat(101)}`, 'q'],
  ])('rejects invalid query %s with VALIDATION_ERROR', async (query, field) => {
    const res = await list(query);
    expect(res.status).toBe(400);
    const body = apiErrorSchema.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.map((d) => d.path)).toContain(field);
  });
});

describe('GET /api/v1/destinations/featured', () => {
  it('returns featured destinations', async () => {
    const body = destinationArrayResponseSchema.parse(
      (await request(app).get('/api/v1/destinations/featured?limit=24')).body,
    );
    expect(body.data.length).toBe(seedDestinations.filter((d) => d.featured).length);
    expect(body.data.every((d) => d.featured)).toBe(true);
  });

  it('returns hidden gems and honours limit', async () => {
    const body = destinationArrayResponseSchema.parse(
      (await request(app).get('/api/v1/destinations/featured?kind=hidden-gems&limit=3')).body,
    );
    expect(body.data).toHaveLength(3);
    expect(body.data.every((d) => d.hiddenGem)).toBe(true);
  });
});

describe('GET /api/v1/destinations/:slug', () => {
  it('returns full details', async () => {
    const res = await request(app).get('/api/v1/destinations/netarhat');
    expect(res.status).toBe(200);
    const { data } = destinationDetailResponseSchema.parse(res.body);
    expect(data).toMatchObject({
      slug: 'netarhat',
      state: 'Jharkhand',
      district: 'Latehar',
      category: { slug: 'mountains' },
      coordinatesVerified: false,
    });
    expect(data.sourceUrls.length).toBeGreaterThan(0);
    expect(data.responsibleTips.length).toBeGreaterThan(0);
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await request(app).get('/api/v1/destinations/atlantis');
    expect(res.status).toBe(404);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed slug', async () => {
    const res = await request(app).get('/api/v1/destinations/Not_A_Slug');
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns nearby destinations sorted by distance, excluding itself', async () => {
    const res = await request(app).get('/api/v1/destinations/hundru-falls/nearby?limit=3');
    expect(res.status).toBe(200);
    const { data } = nearbyResponseSchema.parse(res.body);
    expect(data).toHaveLength(3);
    expect(data.map((d) => d.slug)).not.toContain('hundru-falls');
    expect(data[0]?.slug).toBe('dassam-falls');
    const distances = data.map((d) => d.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('lists states with counts', async () => {
    const { data } = stateListResponseSchema.parse(
      (await request(app).get('/api/v1/destinations/states')).body,
    );
    expect(data.find((s) => s.state === 'Jharkhand')?.destinationCount).toBe(
      seedDestinations.filter((d) => d.state === 'Jharkhand').length,
    );
  });
});

describe('unpublished destinations', () => {
  const db = testDb();
  const slug = 'test-unpublished-place';

  beforeAll(async () => {
    const category = await db.destinationCategory.findUniqueOrThrow({ where: { slug: 'nature' } });
    await db.destination.upsert({
      where: { slug },
      update: { published: false },
      create: {
        slug,
        name: 'Unpublished Test Place',
        state: 'Testland',
        district: 'Test',
        categoryId: category.id,
        shortDescription: 'Hidden from the public API',
        description: 'Hidden from the public API',
        latitude: 23.4,
        longitude: 85.6,
        published: false,
      },
    });
  });

  afterAll(async () => {
    await db.destination.deleteMany({ where: { slug } });
  });

  it('are excluded from lists, details and nearby results', async () => {
    const body = destinationListResponseSchema.parse((await list('?q=Unpublished')).body);
    expect(body.data).toEqual([]);
    expect((await request(app).get(`/api/v1/destinations/${slug}`)).status).toBe(404);
    const nearby = nearbyResponseSchema.parse(
      (await request(app).get('/api/v1/destinations/hundru-falls/nearby?limit=12')).body,
    );
    expect(nearby.data.map((d) => d.slug)).not.toContain(slug);
  });
});

describe('GET /api/v1/categories', () => {
  it('returns all categories in order with published counts', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    const { data } = categoryListResponseSchema.parse(res.body);
    expect(data.map((c) => c.slug)).toEqual([
      'nature',
      'wildlife',
      'waterfalls',
      'heritage',
      'spirituality',
      'culture',
      'adventure',
      'beaches',
      'mountains',
    ]);
    const total = data.reduce((sum, c) => sum + c.destinationCount, 0);
    expect(total).toBe(seedDestinations.length);
  });
});
