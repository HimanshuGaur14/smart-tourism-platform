import { CSRF_HEADER, sessionResponseSchema, type UserRole } from '@smart-tourism/contracts';
import { hash } from 'argon2';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll } from 'vitest';
import { ARGON2_OPTIONS } from '../src/modules/auth/auth.router.js';
import { testDb, TEST_ORIGIN } from './helpers.js';

export const PASSWORD = 'correct horse battery';
let counter = 0;

/** Unique, clearly fake email per test file, cleaned up afterwards. */
export function emailFactory(prefix: string) {
  const db = testDb();
  const domain = `${prefix}-${process.pid}.test`;
  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { endsWith: `@${domain}` } } });
  });
  return () => `user${++counter}@${domain}`;
}

export interface Session {
  agent: ReturnType<typeof request.agent>;
  csrf: string;
  userId: string;
  email: string;
}

/** Registers through the API (TOURIST/VENDOR) and returns a cookie-carrying agent. */
export async function signUp(
  app: Express,
  email: string,
  role: 'TOURIST' | 'VENDOR' = 'TOURIST',
): Promise<Session> {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/v1/auth/register')
    .set('Origin', TEST_ORIGIN)
    .send({ name: 'Test User', email, password: PASSWORD, role });
  if (res.status !== 201)
    throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const { data } = sessionResponseSchema.parse(res.body);
  return { agent, csrf: data.csrfToken!, userId: data.user!.id, email };
}

/** Admins cannot self-register, so they are created directly and then log in. */
export async function signInAs(app: Express, email: string, role: UserRole): Promise<Session> {
  await testDb().user.create({
    data: { email, name: `Test ${role}`, role, passwordHash: await hash(PASSWORD, ARGON2_OPTIONS) },
  });
  const agent = request.agent(app);
  const res = await agent
    .post('/api/v1/auth/login')
    .set('Origin', TEST_ORIGIN)
    .send({ email, password: PASSWORD });
  const { data } = sessionResponseSchema.parse(res.body);
  return { agent, csrf: data.csrfToken!, userId: data.user!.id, email };
}

/** Adds the headers a browser would send on a state-changing request. */
export const withCsrf = (s: Session) => ({ [CSRF_HEADER]: s.csrf, Origin: TEST_ORIGIN });
