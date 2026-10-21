import {
  loginSchema,
  registerSchema,
  SESSION_COOKIE,
  type SessionInfo,
} from '@smart-tourism/contracts';
import { argon2id, hash, verify, type HashOptions } from 'argon2';
import { Router } from 'express';
import type { z } from 'zod';
import type { AppConfig } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import { rateLimit } from '../../lib/rate-limit.js';
import { sessionCookieOptions } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import type { SessionService } from './session.service.js';

/** OWASP-recommended Argon2id parameters (19 MiB, 2 iterations). */
export const ARGON2_OPTIONS: HashOptions & { raw?: false } = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

// Verified against when the email is unknown, so response time does not reveal accounts.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hash('not-a-real-password', ARGON2_OPTIONS));

export function authRouter(db: Db, sessions: SessionService, config: AppConfig): Router {
  const router = Router();
  const cookie = sessionCookieOptions(config);

  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    max: config.env === 'test' ? 1000 : 10,
    key: (req) =>
      `${req.ip}:${String((req.body as { email?: unknown })?.email ?? '').toLowerCase()}`,
  });

  router.post('/register', loginLimiter, validate({ body: registerSchema }), async (_req, res) => {
    const input = res.locals.valid.body as z.output<typeof registerSchema>;
    const existing = await db.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) throw AppError.conflict('An account with this email already exists');

    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: await hash(input.password, ARGON2_OPTIONS),
      },
      select: { id: true, name: true, email: true, role: true },
    });
    const session = await sessions.create(user.id);
    res.cookie(SESSION_COOKIE, session.token, cookie);
    res.status(201).json({ data: { user, csrfToken: session.csrfToken } satisfies SessionInfo });
  });

  router.post('/login', loginLimiter, validate({ body: loginSchema }), async (_req, res) => {
    const input = res.locals.valid.body as z.output<typeof loginSchema>;
    const user = await db.user.findUnique({ where: { email: input.email } });
    const ok = user
      ? await verify(user.passwordHash, input.password)
      : (await verify(await getDummyHash(), input.password), false);
    if (!user || !ok) throw new AppError(401, 'UNAUTHENTICATED', 'Email or password is incorrect');

    // Rotate: drop the session this browser had before logging in.
    if (res.locals.auth) await sessions.revoke(res.locals.auth.sessionId);
    const session = await sessions.create(user.id);
    res.cookie(SESSION_COOKIE, session.token, cookie);
    res.json({
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        csrfToken: session.csrfToken,
      } satisfies SessionInfo,
    });
  });

  router.post('/logout', async (_req, res) => {
    if (res.locals.auth) await sessions.revoke(res.locals.auth.sessionId);
    res.clearCookie(SESSION_COOKIE, { ...cookie, maxAge: undefined });
    res.status(204).end();
  });

  router.get('/me', (_req, res) => {
    const auth = res.locals.auth;
    res.set('Cache-Control', 'no-store').json({
      data: { user: auth?.user ?? null, csrfToken: auth?.csrfToken ?? null } satisfies SessionInfo,
    });
  });

  return router;
}
