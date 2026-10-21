import {
  itineraryResponseSchema,
  itinerarySummaryArrayResponseSchema,
  savedDestinationArrayResponseSchema,
} from '@smart-tourism/contracts';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { emailFactory, signUp, withCsrf, type Session } from './auth-helpers.js';
import { makeTestApp, TEST_ORIGIN } from './helpers.js';

const app = makeTestApp();
const nextEmail = emailFactory('trips');
let alice: Session;
let bob: Session;

beforeAll(async () => {
  [alice, bob] = await Promise.all([signUp(app, nextEmail()), signUp(app, nextEmail())]);
});

describe('saved destinations', () => {
  it('requires a session', async () => {
    expect((await request(app).get('/api/v1/me/saved-destinations')).status).toBe(401);
  });

  it('saves idempotently, lists and removes', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await alice.agent
        .put('/api/v1/me/saved-destinations/netarhat')
        .set(withCsrf(alice));
      expect(res.status).toBe(200);
    }
    const list = savedDestinationArrayResponseSchema.parse(
      (await alice.agent.get('/api/v1/me/saved-destinations')).body,
    );
    expect(list.data.map((d) => d.slug)).toEqual(['netarhat']);

    // Another user's list is separate.
    const bobs = (await bob.agent.get('/api/v1/me/saved-destinations')).body.data;
    expect(bobs).toEqual([]);

    const del = await alice.agent
      .delete('/api/v1/me/saved-destinations/netarhat')
      .set(withCsrf(alice));
    expect(del.status).toBe(204);
    expect((await alice.agent.get('/api/v1/me/saved-destinations')).body.data).toEqual([]);
  });

  it('rejects unknown destinations and missing CSRF tokens', async () => {
    const unknown = await alice.agent
      .put('/api/v1/me/saved-destinations/atlantis')
      .set(withCsrf(alice));
    expect(unknown.status).toBe(404);
    const noCsrf = await alice.agent
      .put('/api/v1/me/saved-destinations/netarhat')
      .set('Origin', TEST_ORIGIN);
    expect(noCsrf.status).toBe(403);
    expect(noCsrf.body.error.code).toBe('CSRF_INVALID');
  });
});

describe('itineraries', () => {
  const body = {
    title: 'Jharkhand waterfalls',
    startDate: '2026-12-10',
    durationDays: 3,
    interests: ['waterfalls'],
    items: [
      { destinationSlug: 'netarhat', dayNumber: 1 },
      { destinationSlug: 'hundru-falls', dayNumber: 2, notes: 'Go early' },
    ],
  };

  it('runs full CRUD with ordered items', async () => {
    const created = await alice.agent
      .post('/api/v1/me/itineraries')
      .set(withCsrf(alice))
      .send(body);
    expect(created.status).toBe(201);
    const it1 = itineraryResponseSchema.parse(created.body).data;
    expect(it1.items.map((i) => [i.position, i.destination.slug])).toEqual([
      [0, 'netarhat'],
      [1, 'hundru-falls'],
    ]);
    expect(it1.startDate).toBe('2026-12-10');

    const list = itinerarySummaryArrayResponseSchema.parse(
      (await alice.agent.get('/api/v1/me/itineraries')).body,
    );
    expect(list.data.find((i) => i.id === it1.id)?.itemCount).toBe(2);

    // Reorder by sending the items in a new order.
    const patched = await alice.agent
      .patch(`/api/v1/me/itineraries/${it1.id}`)
      .set(withCsrf(alice))
      .send({ title: 'Waterfalls, reversed', items: [...body.items].reverse() });
    expect(patched.status).toBe(200);
    const it2 = itineraryResponseSchema.parse(patched.body).data;
    expect(it2.title).toBe('Waterfalls, reversed');
    expect(it2.items.map((i) => i.destination.slug)).toEqual(['hundru-falls', 'netarhat']);
    expect(it2.items[0]!.notes).toBe('Go early');

    // Metadata-only patch keeps the items.
    const kept = await alice.agent
      .patch(`/api/v1/me/itineraries/${it1.id}`)
      .set(withCsrf(alice))
      .send({ notes: 'Pack rain gear' });
    expect(kept.body.data.items).toHaveLength(2);

    const del = await alice.agent.delete(`/api/v1/me/itineraries/${it1.id}`).set(withCsrf(alice));
    expect(del.status).toBe(204);
    expect((await alice.agent.get(`/api/v1/me/itineraries/${it1.id}`)).status).toBe(404);
  });

  it("hides other users' itineraries (404, not 403)", async () => {
    const created = await alice.agent
      .post('/api/v1/me/itineraries')
      .set(withCsrf(alice))
      .send(body);
    const id = created.body.data.id as string;
    expect((await bob.agent.get(`/api/v1/me/itineraries/${id}`)).status).toBe(404);
    expect(
      (
        await bob.agent
          .patch(`/api/v1/me/itineraries/${id}`)
          .set(withCsrf(bob))
          .send({ title: 'Mine now' })
      ).status,
    ).toBe(404);
    expect((await bob.agent.delete(`/api/v1/me/itineraries/${id}`).set(withCsrf(bob))).status).toBe(
      404,
    );
    expect((await alice.agent.get(`/api/v1/me/itineraries/${id}`)).body.data.title).toBe(
      body.title,
    );
  });

  it('validates input', async () => {
    const post = (b: object) =>
      alice.agent.post('/api/v1/me/itineraries').set(withCsrf(alice)).send(b);
    expect((await post({ title: 'x' })).status).toBe(400);
    const unknown = await post({ title: 'Trip', items: [{ destinationSlug: 'atlantis' }] });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.details[0].path).toBe('items.0.destinationSlug');
    const outOfRange = await post({ ...body, durationDays: 1 });
    expect(outOfRange.status).toBe(400);
    expect(
      (await request(app).post('/api/v1/me/itineraries').set('Origin', TEST_ORIGIN).send(body))
        .status,
    ).toBe(401);
  });
});
