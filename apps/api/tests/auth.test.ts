import { apiErrorSchema, sessionResponseSchema, SESSION_COOKIE } from '@smart-tourism/contracts';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { emailFactory, PASSWORD, signUp, withCsrf } from './auth-helpers.js';
import { makeTestApp, testDb, TEST_ORIGIN } from './helpers.js';

const app = makeTestApp();
const nextEmail = emailFactory('auth');
const register = (body: object) =>
  request(app).post('/api/v1/auth/register').set('Origin', TEST_ORIGIN).send(body);

function sessionCookie(res: request.Response): string {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  const cookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) throw new Error('no session cookie');
  return cookie;
}

describe('registration', () => {
  it('creates a user, hashes the password with Argon2id and sets an HttpOnly session cookie', async () => {
    const email = nextEmail();
    const res = await register({ name: 'Asha', email: email.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(201);
    const { data } = sessionResponseSchema.parse(res.body);
    expect(data.user).toMatchObject({ email, role: 'TOURIST', name: 'Asha' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Secure/i); // local HTTP; forced on in production

    const user = await testDb().user.findUniqueOrThrow({ where: { email } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.passwordHash).not.toContain(PASSWORD);
    // Only a hash of the cookie token is stored.
    const token = cookie.split(';')[0]!.split('=')[1]!;
    expect(await testDb().session.findFirst({ where: { id: token } })).toBeNull();
  });

  it('rejects duplicate emails with 409', async () => {
    const email = nextEmail();
    await register({ name: 'One', email, password: PASSWORD });
    const res = await register({ name: 'Two', email, password: PASSWORD });
    expect(res.status).toBe(409);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('CONFLICT');
  });

  it('validates input and refuses self-registered admins', async () => {
    const weak = await register({ name: 'X', email: 'not-an-email', password: 'short' });
    expect(weak.status).toBe(400);
    const paths = apiErrorSchema.parse(weak.body).error.details?.map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password']));

    const admin = await register({
      name: 'Mallory',
      email: nextEmail(),
      password: PASSWORD,
      role: 'ADMIN',
    });
    expect(admin.status).toBe(400);
  });
});

describe('login, session and logout', () => {
  it('logs in, returns the current user, logs out and invalidates the session', async () => {
    const email = nextEmail();
    await register({ name: 'Ravi', email, password: PASSWORD });

    const login = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', TEST_ORIGIN)
      .send({ email, password: PASSWORD });
    expect(login.status).toBe(200);
    const cookie = sessionCookie(login).split(';')[0]!;
    const { data } = sessionResponseSchema.parse(login.body);

    const me = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(sessionResponseSchema.parse(me.body).data.user?.email).toBe(email);
    expect(me.headers['cache-control']).toBe('no-store');

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', TEST_ORIGIN)
      .set('X-CSRF-Token', data.csrfToken!);
    expect(logout.status).toBe(204);

    // Replaying the old cookie no longer works: the server-side session is gone.
    const after = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(sessionResponseSchema.parse(after.body).data.user).toBeNull();
    const protectedRes = await request(app).get('/api/v1/me/enquiries').set('Cookie', cookie);
    expect(protectedRes.status).toBe(401);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const email = nextEmail();
    await register({ name: 'Ravi', email, password: PASSWORD });
    const wrong = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrong password!!' });
    const unknown = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: nextEmail(), password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('treats an expired session as signed out', async () => {
    const s = await signUp(app, nextEmail());
    await testDb().session.updateMany({
      where: { userId: s.userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await s.agent.get('/api/v1/me/enquiries');
    expect(res.status).toBe(401);
    expect(await testDb().session.count({ where: { userId: s.userId } })).toBe(0);
  });

  it('returns a null user without a session', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(sessionResponseSchema.parse(res.body).data).toEqual({ user: null, csrfToken: null });
  });
});

describe('protection', () => {
  it('rejects unauthenticated access to protected routes with 401', async () => {
    for (const path of [
      '/api/v1/me/enquiries',
      '/api/v1/me/listings',
      '/api/v1/vendor/enquiries',
      '/api/v1/admin/destinations',
    ]) {
      const res = await request(app).get(path);
      expect(res.status, path).toBe(401);
      expect(apiErrorSchema.parse(res.body).error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('requires the CSRF token on authenticated state-changing requests', async () => {
    const s = await signUp(app, nextEmail(), 'VENDOR');
    const body = {
      type: 'GUIDE',
      title: 'A guide',
      summary: 'A good local guide',
      description: 'x'.repeat(40),
      state: 'Goa',
      district: 'North Goa',
    };

    const missing = await s.agent.post('/api/v1/listings').set('Origin', TEST_ORIGIN).send(body);
    expect(missing.status).toBe(403);
    expect(missing.body.error.code).toBe('CSRF_INVALID');

    const wrong = await s.agent
      .post('/api/v1/listings')
      .set('Origin', TEST_ORIGIN)
      .set('X-CSRF-Token', 'nope')
      .send(body);
    expect(wrong.status).toBe(403);

    const ok = await s.agent.post('/api/v1/listings').set(withCsrf(s)).send(body);
    expect(ok.status).toBe(201);
  });

  it('rejects state-changing requests from another origin', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: nextEmail(), password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_INVALID');
  });
});
