import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  destinationAnalyticsResponseSchema,
  destinationForecastArrayResponseSchema,
  destinationForecastResponseSchema,
  footfallResponseSchema,
} from '@smart-tourism/contracts';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DemoForecastService } from '../src/services/forecast/demo-forecast.service.js';
import { HttpForecastService } from '../src/services/forecast/http-forecast.service.js';
import type { ForecastRequest } from '../src/services/forecast/types.js';
import { makeTestApp } from './helpers.js';

const req: ForecastRequest = {
  destinations: [
    { id: 'd1', slug: 'one', name: 'One', latitude: 23, longitude: 85, category: 'waterfalls' },
    { id: 'd2', slug: 'two', name: 'Two', latitude: 24, longitude: 86, category: 'heritage' },
  ],
  startDate: '2026-11-01',
  horizonDays: 3,
};

/** Fake ML service whose behaviour each test chooses. */
let behaviour: (body: unknown) => {
  status?: number;
  delayMs?: number;
  json?: unknown;
  raw?: string;
} = () => ({});
let server: Server;
let baseUrl: string;
let lastBody: unknown;

beforeAll(async () => {
  server = createServer((r, res) => {
    let data = '';
    r.on('data', (c) => (data += c));
    r.on('end', () => {
      lastBody = JSON.parse(data || 'null');
      const b = behaviour(lastBody);
      setTimeout(() => {
        res.writeHead(b.status ?? 200, { 'Content-Type': 'application/json' });
        res.end(b.raw ?? JSON.stringify(b.json ?? {}));
      }, b.delayMs ?? 0);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const validModelResponse = {
  modelVersion: 'footfall-test-1.0',
  generatedAt: '2026-10-21T09:00:00Z',
  forecasts: [
    {
      destinationId: 'd1',
      forecastDate: '2026-11-02',
      predictedVisitors: 900,
      crowdLevel: 'MODERATE',
    },
    {
      destinationId: 'd1',
      forecastDate: '2026-11-01',
      predictedVisitors: 1200,
      crowdLevel: 'HIGH',
      interval: { lower: 1000, upper: 1400, level: 0.8 },
    },
  ],
};

describe('HttpForecastService', () => {
  it('sends the documented request and maps valid model output to MODEL forecasts', async () => {
    behaviour = () => ({ json: validModelResponse });
    const [d1, d2] = await new HttpForecastService(baseUrl, 1000).forecast(req);
    expect(lastBody).toEqual({
      destinations: [
        { destinationId: 'd1', slug: 'one', latitude: 23, longitude: 85 },
        { destinationId: 'd2', slug: 'two', latitude: 24, longitude: 86 },
      ],
      startDate: '2026-11-01',
      horizonDays: 3,
    });
    expect(d1).toMatchObject({
      source: 'MODEL',
      modelVersion: 'footfall-test-1.0',
      unavailableReason: null,
    });
    expect(d1!.points.map((p) => p.date)).toEqual(['2026-11-01', '2026-11-02']);
    expect(d1!.points[0]!.interval).toEqual({ lower: 1000, upper: 1400, level: 0.8 });
    // A destination the model did not return is unavailable, never filled in.
    expect(d2).toMatchObject({
      source: 'UNAVAILABLE',
      unavailableReason: 'missing_from_response',
      points: [],
    });
  });

  it('returns UNAVAILABLE (timeout) when the model is too slow', async () => {
    behaviour = () => ({ delayMs: 500, json: validModelResponse });
    const started = Date.now();
    const result = await new HttpForecastService(baseUrl, 100).forecast(req);
    expect(Date.now() - started).toBeLessThan(450);
    expect(
      result.every((f) => f.source === 'UNAVAILABLE' && f.unavailableReason === 'timeout'),
    ).toBe(true);
  });

  it('returns UNAVAILABLE (service_error) on 5xx and on connection failure', async () => {
    behaviour = () => ({ status: 503, json: { detail: 'model loading' } });
    const fiveXx = await new HttpForecastService(baseUrl, 1000).forecast(req);
    expect(fiveXx[0]).toMatchObject({ source: 'UNAVAILABLE', unavailableReason: 'service_error' });

    const refused = await new HttpForecastService('http://127.0.0.1:1', 1000).forecast(req);
    expect(refused[0]).toMatchObject({ source: 'UNAVAILABLE', unavailableReason: 'service_error' });
  });

  it.each([
    ['non-JSON body', { raw: 'not json' }],
    ['wrong shape', { json: { forecasts: 'nope' } }],
    [
      'negative visitors',
      {
        json: {
          ...validModelResponse,
          forecasts: [{ ...validModelResponse.forecasts[0], predictedVisitors: -5 }],
        },
      },
    ],
    [
      'unknown crowd level',
      {
        json: {
          ...validModelResponse,
          forecasts: [{ ...validModelResponse.forecasts[0], crowdLevel: 'PACKED' }],
        },
      },
    ],
    [
      'inverted interval',
      {
        json: {
          ...validModelResponse,
          forecasts: [
            { ...validModelResponse.forecasts[1], interval: { lower: 9, upper: 1, level: 0.8 } },
          ],
        },
      },
    ],
  ])('rejects invalid model output (%s) as UNAVAILABLE', async (_name, response) => {
    behaviour = () => response;
    const result = await new HttpForecastService(baseUrl, 1000).forecast(req);
    expect(result.every((f) => f.source === 'UNAVAILABLE' && f.points.length === 0)).toBe(true);
    expect(result[0]!.unavailableReason).toMatch(/invalid_response|service_error/);
  });
});

describe('DemoForecastService', () => {
  it('labels output as DEMO, is deterministic and covers the horizon', async () => {
    const svc = new DemoForecastService();
    const a = await svc.forecast(req);
    const b = await svc.forecast(req);
    expect(a.every((f) => f.source === 'DEMO' && f.modelVersion?.startsWith('demo'))).toBe(true);
    expect(a[0]!.points).toHaveLength(3);
    expect(a[0]!.points.map((p) => p.predictedVisitors)).toEqual(
      b[0]!.points.map((p) => p.predictedVisitors),
    );
    expect(a[0]!.points.every((p) => p.interval === null)).toBe(true);
  });
});

describe('forecast and analytics endpoints', () => {
  it('serves demo forecasts through Express, clearly labelled', async () => {
    const res = await request(makeTestApp()).get('/api/v1/forecasts/netarhat?days=7');
    expect(res.status).toBe(200);
    const { data } = destinationForecastResponseSchema.parse(res.body);
    expect(data).toMatchObject({ source: 'DEMO', destination: { slug: 'netarhat' } });
    expect(data.points).toHaveLength(7);
  });

  it('keeps the API up and reports UNAVAILABLE when the model service is down', async () => {
    const app = makeTestApp({}, undefined, new HttpForecastService('http://127.0.0.1:1', 300));
    const res = await request(app).get('/api/v1/forecasts?destinations=netarhat,hampi');
    expect(res.status).toBe(200);
    const { data } = destinationForecastArrayResponseSchema.parse(res.body);
    expect(data).toHaveLength(2);
    expect(data.every((f) => f.source === 'UNAVAILABLE' && f.points.length === 0)).toBe(true);
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
  });

  it('validates forecast parameters', async () => {
    const app = makeTestApp();
    expect((await request(app).get('/api/v1/forecasts/netarhat?days=500')).status).toBe(400);
    expect((await request(app).get('/api/v1/forecasts/netarhat?from=2001-01-01')).status).toBe(400);
    expect((await request(app).get('/api/v1/forecasts/atlantis')).status).toBe(404);
  });

  it('labels footfall analytics as DEMO with a disclaimer', async () => {
    const res = await request(makeTestApp()).get(
      '/api/v1/analytics/footfall?destinations=netarhat,hampi&from=2025-01&months=12',
    );
    const { data } = footfallResponseSchema.parse(res.body);
    expect(data.source).toBe('DEMO');
    expect(data.disclaimer).toMatch(/not real/i);
    expect(data.months[0]).toBe('2025-01');
    expect(data.series.map((s) => s.destination.slug).sort()).toEqual(['hampi', 'netarhat']);
    expect(data.seasonality).toHaveLength(12);
  });

  it('returns destination insights, crowd distribution, anomalies and alternatives', async () => {
    const res = await request(makeTestApp()).get('/api/v1/analytics/destinations');
    const { data } = destinationAnalyticsResponseSchema.parse(res.body);
    expect(data.source).toBe('DEMO');
    expect(data.crowdDistribution.reduce((s, c) => s + c.count, 0)).toBe(data.insights.length);
    for (const alt of data.alternatives) {
      expect(
        alt.suggestions.every((s) => s.crowdLevel === 'LOW' || s.crowdLevel === 'MODERATE'),
      ).toBe(true);
    }
    expect(data.anomalies.every((a) => Math.abs(a.deviationPct) >= 35)).toBe(true);
  });
});
