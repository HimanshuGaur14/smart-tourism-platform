import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { healthResponseSchema, apiErrorSchema } from '@smart-tourism/contracts';
import { createPrismaClient } from '../src/lib/prisma.js';
import { makeTestApp, TEST_ORIGIN } from './helpers.js';

describe('GET /api/v1/health', () => {
  const app = makeTestApp();

  it('returns 200 with a payload matching the shared contract', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['cache-control']).toBe('no-store');
    const body = healthResponseSchema.parse(res.body);
    expect(body.data.status).toBe('ok');
    expect(body.data.forecastProvider).toBe('demo');
    expect(body.data.database).toBe('up');
  });

  it('reports 503 degraded when the database is unreachable', async () => {
    const deadDb = createPrismaClient('postgresql://nobody:nothing@127.0.0.1:1/none');
    try {
      const res = await request(makeTestApp({}, deadDb)).get('/api/v1/health');
      expect(res.status).toBe(503);
      const body = healthResponseSchema.parse(res.body);
      expect(body.data).toMatchObject({ status: 'degraded', database: 'down' });
    } finally {
      await deadDb.$disconnect();
    }
  });

  it('sets a request id and security headers, and hides the framework', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('CORS', () => {
  const app = makeTestApp();

  it('allows the configured frontend origin with credentials', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', TEST_ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBe(TEST_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not reflect other origins', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).not.toBe('https://evil.example');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });
});

describe('error handling', () => {
  const app = makeTestApp();

  it('returns a JSON 404 envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    const body = apiErrorSchema.parse(res.body);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.requestId).toBeDefined();
  });

  it('returns 400 for malformed JSON without leaking internals', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    const body = apiErrorSchema.parse(res.body);
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
  });
});
