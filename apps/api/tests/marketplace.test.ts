import {
  apiErrorSchema,
  enquiryArrayResponseSchema,
  listingListResponseSchema,
  ownedListingArrayResponseSchema,
  ownedListingResponseSchema,
} from '@smart-tourism/contracts';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { sampleListings } from '../prisma/seed-data/listings.js';
import { emailFactory, signInAs, signUp, withCsrf, type Session } from './auth-helpers.js';
import { makeTestApp, testDb, TEST_ORIGIN } from './helpers.js';

const app = makeTestApp();
const nextEmail = emailFactory('market');

const listingBody = (title = 'Riverside homestay') => ({
  type: 'HOMESTAY',
  title,
  summary: 'Two rooms by the river with home-cooked food',
  description:
    'A calm family homestay with two rooms, meals and walks along the river with the hosts.',
  state: 'Jharkhand',
  district: 'Ranchi',
  destinationSlug: 'hundru-falls',
});

let vendorA: Session;
let vendorB: Session;
let tourist: Session;
let otherTourist: Session;
let admin: Session;

beforeAll(async () => {
  [vendorA, vendorB, tourist, otherTourist] = await Promise.all([
    signUp(app, nextEmail(), 'VENDOR'),
    signUp(app, nextEmail(), 'VENDOR'),
    signUp(app, nextEmail()),
    signUp(app, nextEmail()),
  ]);
  admin = await signInAs(app, nextEmail(), 'ADMIN');
});

async function createListing(s: Session, title?: string) {
  const res = await s.agent.post('/api/v1/listings').set(withCsrf(s)).send(listingBody(title));
  expect(res.status).toBe(201);
  return ownedListingResponseSchema.parse(res.body).data;
}

async function approve(id: string) {
  const res = await admin.agent
    .patch(`/api/v1/admin/listings/${id}/moderation`)
    .set(withCsrf(admin))
    .send({ moderationStatus: 'APPROVED' });
  expect(res.status).toBe(200);
}

const publicSlugs = async (q = '') =>
  listingListResponseSchema
    .parse((await request(app).get(`/api/v1/listings?pageSize=50${q}`)).body)
    .data.map((l) => l.slug);

describe('public marketplace', () => {
  it('lists approved, active listings with filters; samples are flagged', async () => {
    const body = listingListResponseSchema.parse(
      (await request(app).get('/api/v1/listings?pageSize=50')).body,
    );
    const samples = body.data.filter((l) => l.isSample);
    expect(samples.length).toBe(sampleListings.length);
    expect(JSON.stringify(body)).not.toContain('moderationStatus');

    const guides = listingListResponseSchema.parse(
      (await request(app).get('/api/v1/listings?type=GUIDE')).body,
    );
    expect(guides.data.length).toBeGreaterThan(0);
    expect(guides.data.every((l) => l.type === 'GUIDE')).toBe(true);

    const byDestination = await publicSlugs('&destination=majuli');
    expect(byDestination).toEqual(['sample-majuli-mask-workshop']);
  });

  it('rejects invalid filters', async () => {
    const res = await request(app).get('/api/v1/listings?type=CASINO');
    expect(res.status).toBe(400);
  });
});

describe('vendor listing management', () => {
  it('only vendors and admins can create listings', async () => {
    expect(
      (await request(app).post('/api/v1/listings').set('Origin', TEST_ORIGIN).send(listingBody()))
        .status,
    ).toBe(401);
    const res = await tourist.agent
      .post('/api/v1/listings')
      .set(withCsrf(tourist))
      .send(listingBody());
    expect(res.status).toBe(403);
  });

  it('new listings are pending and hidden until approved', async () => {
    const listing = await createListing(vendorA);
    expect(listing.moderationStatus).toBe('PENDING');
    expect(listing.destination?.slug).toBe('hundru-falls');
    expect(await publicSlugs()).not.toContain(listing.slug);
    // The owner can still see it; other people get 404.
    expect((await vendorA.agent.get(`/api/v1/listings/${listing.id}`)).status).toBe(200);
    expect((await request(app).get(`/api/v1/listings/${listing.id}`)).status).toBe(404);

    await approve(listing.id);
    expect(await publicSlugs()).toContain(listing.slug);
    expect((await request(app).get(`/api/v1/listings/${listing.slug}`)).status).toBe(200);
  });

  it('vendors cannot modify or delete another vendor’s listing', async () => {
    const listing = await createListing(vendorA);
    const patch = await vendorB.agent
      .patch(`/api/v1/listings/${listing.id}`)
      .set(withCsrf(vendorB))
      .send({ title: 'Hijacked listing' });
    expect(patch.status).toBe(404);
    const del = await vendorB.agent.delete(`/api/v1/listings/${listing.id}`).set(withCsrf(vendorB));
    expect(del.status).toBe(404);
    const row = await testDb().vendorListing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(row.title).toBe('Riverside homestay');

    const mine = ownedListingArrayResponseSchema.parse(
      (await vendorB.agent.get('/api/v1/me/listings')).body,
    );
    expect(mine.data.map((l) => l.id)).not.toContain(listing.id);
  });

  it('deactivating hides a listing; content edits go back to review', async () => {
    const listing = await createListing(vendorA, 'Hilltop homestay');
    await approve(listing.id);

    const off = await vendorA.agent
      .patch(`/api/v1/listings/${listing.id}`)
      .set(withCsrf(vendorA))
      .send({ isActive: false });
    expect(ownedListingResponseSchema.parse(off.body).data).toMatchObject({
      isActive: false,
      moderationStatus: 'APPROVED',
    });
    expect(await publicSlugs()).not.toContain(listing.slug);

    const edit = await vendorA.agent
      .patch(`/api/v1/listings/${listing.id}`)
      .set(withCsrf(vendorA))
      .send({ isActive: true, summary: 'Updated summary for the listing' });
    expect(ownedListingResponseSchema.parse(edit.body).data).toMatchObject({
      isActive: true,
      moderationStatus: 'PENDING',
    });
  });

  it('validates listing input', async () => {
    const res = await vendorA.agent
      .post('/api/v1/listings')
      .set(withCsrf(vendorA))
      .send({
        ...listingBody(),
        imageUrl: 'http://insecure.example/x.jpg',
        destinationSlug: 'atlantis',
        title: 'x',
      });
    expect(res.status).toBe(400);
    const paths = apiErrorSchema.parse(res.body).error.details?.map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['title', 'imageUrl']));
  });

  it('owners can delete their listing', async () => {
    const listing = await createListing(vendorA, 'Temporary listing');
    expect(
      (await vendorA.agent.delete(`/api/v1/listings/${listing.id}`).set(withCsrf(vendorA))).status,
    ).toBe(204);
    expect(await testDb().vendorListing.findUnique({ where: { id: listing.id } })).toBeNull();
  });
});

describe('enquiries', () => {
  let listingId: string;
  beforeAll(async () => {
    const listing = await createListing(vendorA, 'Enquiry test homestay');
    await approve(listing.id);
    listingId = listing.id;
  });

  const enquiry = (overrides: object = {}) => ({
    listingId,
    name: 'Meera',
    email: 'meera@example.test',
    message: 'Is the room available for two people next month?',
    travelDate: '2027-01-15',
    groupSize: 2,
    ...overrides,
  });

  it('accepts a guest enquiry and stores it', async () => {
    const res = await request(app)
      .post('/api/v1/enquiries')
      .set('Origin', TEST_ORIGIN)
      .send(enquiry());
    expect(res.status).toBe(201);
    const row = await testDb().enquiry.findUniqueOrThrow({ where: { id: res.body.data.id } });
    expect(row).toMatchObject({ listingId, userId: null, status: 'NEW', groupSize: 2 });
  });

  it('validates enquiries server-side', async () => {
    const res = await request(app)
      .post('/api/v1/enquiries')
      .send(enquiry({ email: 'nope', message: 'hi', groupSize: 0 }));
    expect(res.status).toBe(400);
    const paths = apiErrorSchema.parse(res.body).error.details?.map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'message', 'groupSize']));
  });

  it('refuses enquiries for listings that are not public', async () => {
    const pending = await createListing(vendorA, 'Pending listing');
    const res = await request(app)
      .post('/api/v1/enquiries')
      .send(enquiry({ listingId: pending.id }));
    expect(res.status).toBe(404);
  });

  it('shows tourists only their own enquiries, and vendors only enquiries on their listings', async () => {
    const sent = await tourist.agent
      .post('/api/v1/enquiries')
      .set(withCsrf(tourist))
      .send(enquiry({ name: 'Tourist One' }));
    expect(sent.status).toBe(201);
    const id = sent.body.data.id as string;

    const mine = enquiryArrayResponseSchema.parse(
      (await tourist.agent.get('/api/v1/me/enquiries')).body,
    );
    expect(mine.data.map((e) => e.id)).toContain(id);
    const others = enquiryArrayResponseSchema.parse(
      (await otherTourist.agent.get('/api/v1/me/enquiries')).body,
    );
    expect(others.data.map((e) => e.id)).not.toContain(id);

    const received = enquiryArrayResponseSchema.parse(
      (await vendorA.agent.get('/api/v1/vendor/enquiries')).body,
    );
    expect(received.data.map((e) => e.id)).toContain(id);
    const notMine = enquiryArrayResponseSchema.parse(
      (await vendorB.agent.get('/api/v1/vendor/enquiries')).body,
    );
    expect(notMine.data.map((e) => e.id)).not.toContain(id);

    // Tourists cannot use vendor endpoints.
    expect((await tourist.agent.get('/api/v1/vendor/enquiries')).status).toBe(403);

    // Only the listing owner can change the status.
    const hijack = await vendorB.agent
      .patch(`/api/v1/vendor/enquiries/${id}`)
      .set(withCsrf(vendorB))
      .send({ status: 'CLOSED' });
    expect(hijack.status).toBe(404);
    const update = await vendorA.agent
      .patch(`/api/v1/vendor/enquiries/${id}`)
      .set(withCsrf(vendorA))
      .send({ status: 'RESPONDED' });
    expect(update.status).toBe(200);
    expect(update.body.data.status).toBe('RESPONDED');
  });

  it('vendors cannot enquire about their own listing', async () => {
    const res = await vendorA.agent
      .post('/api/v1/enquiries')
      .set(withCsrf(vendorA))
      .send(enquiry());
    expect(res.status).toBe(400);
  });
});

describe('admin', () => {
  const destination = {
    slug: 'test-admin-destination',
    name: 'Test Admin Destination',
    state: 'Jharkhand',
    district: 'Ranchi',
    category: 'nature',
    shortDescription: 'A destination created by the admin test',
    description: 'A destination created by the admin test suite, used to check admin CRUD.',
    latitude: 23.3,
    longitude: 85.3,
  };

  it('blocks non-admins', async () => {
    expect((await tourist.agent.get('/api/v1/admin/destinations')).status).toBe(403);
    expect((await vendorA.agent.get('/api/v1/admin/listings')).status).toBe(403);
    expect((await vendorA.agent.get('/api/v1/analytics/overview')).status).toBe(403);
    const moderate = await vendorA.agent
      .patch(`/api/v1/admin/listings/x/moderation`)
      .set(withCsrf(vendorA))
      .send({ moderationStatus: 'APPROVED' });
    expect(moderate.status).toBe(403);
  });

  it('creates, unpublishes and deletes a destination', async () => {
    await testDb().destination.deleteMany({ where: { slug: destination.slug } });
    const created = await admin.agent
      .post('/api/v1/admin/destinations')
      .set(withCsrf(admin))
      .send(destination);
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    expect((await request(app).get(`/api/v1/destinations/${destination.slug}`)).status).toBe(200);
    const one = await admin.agent.get(`/api/v1/admin/destinations/${id}`);
    expect(one.status).toBe(200);
    expect(one.body.data).toMatchObject({ id, slug: destination.slug, published: true });
    expect((await tourist.agent.get(`/api/v1/admin/destinations/${id}`)).status).toBe(403);
    expect((await admin.agent.get('/api/v1/admin/destinations/no-such-id')).status).toBe(404);

    const dup = await admin.agent
      .post('/api/v1/admin/destinations')
      .set(withCsrf(admin))
      .send(destination);
    expect(dup.status).toBe(409);

    await admin.agent
      .patch(`/api/v1/admin/destinations/${id}`)
      .set(withCsrf(admin))
      .send({ published: false });
    expect((await request(app).get(`/api/v1/destinations/${destination.slug}`)).status).toBe(404);

    expect(
      (await admin.agent.delete(`/api/v1/admin/destinations/${id}`).set(withCsrf(admin))).status,
    ).toBe(204);
  });

  it('validates destination coordinates are within India’s bounding box', async () => {
    const res = await admin.agent
      .post('/api/v1/admin/destinations')
      .set(withCsrf(admin))
      .send({ ...destination, latitude: 51.5, longitude: -0.1 });
    expect(res.status).toBe(400);
  });

  it('edits a category name and returns real platform counts', async () => {
    const res = await admin.agent
      .patch('/api/v1/admin/categories/beaches')
      .set(withCsrf(admin))
      .send({ name: 'Beaches & islands' });
    expect(res.body.data.name).toBe('Beaches & islands');
    await admin.agent
      .patch('/api/v1/admin/categories/beaches')
      .set(withCsrf(admin))
      .send({ name: 'Beaches' });

    const overview = await admin.agent.get('/api/v1/analytics/overview');
    expect(overview.status).toBe(200);
    expect(overview.body.data.listings.sample).toBe(sampleListings.length);
    expect(overview.body.data.forecastSource).toBe('DEMO');
  });
});
