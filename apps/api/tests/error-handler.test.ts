import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { apiErrorSchema } from '@smart-tourism/contracts';
import { AppError } from '../src/lib/errors.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { validate } from '../src/middleware/validate.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.get(
    '/items',
    validate({ query: z.object({ page: z.coerce.number().int().min(1) }) }),
    (_req, res) => {
      res.json({ data: res.locals.valid });
    },
  );
  app.get('/forbidden', () => {
    throw AppError.forbidden();
  });
  app.get('/boom', () => {
    throw new Error('database password is hunter2');
  });
  app.use(errorHandler);
  return app;
}

describe('validate + errorHandler', () => {
  const app = buildApp();

  it('passes parsed values through res.locals.valid', async () => {
    const res = await request(app).get('/items?page=2');
    expect(res.status).toBe(200);
    expect(res.body.data.query.page).toBe(2);
  });

  it('maps Zod failures to 400 VALIDATION_ERROR with field details', async () => {
    const res = await request(app).get('/items?page=0');
    expect(res.status).toBe(400);
    const body = apiErrorSchema.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.[0]?.path).toBe('page');
  });

  it('maps AppError to its status and code', async () => {
    const res = await request(app).get('/forbidden');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('hides unexpected error messages behind a generic 500', async () => {
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });
});
