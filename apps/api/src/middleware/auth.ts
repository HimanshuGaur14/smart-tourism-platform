import { CSRF_HEADER, SESSION_COOKIE, type UserRole } from '@smart-tourism/contracts';
import type { CookieOptions, RequestHandler } from 'express';
import type { AppConfig } from '../config/env.js';
import { safeEqual } from '../lib/crypto.js';
import { AppError } from '../lib/errors.js';
import type { AuthContext } from '../modules/auth/auth.types.js';
import { SESSION_TTL_MS, type SessionService } from '../modules/auth/session.service.js';

export function sessionCookieOptions(config: AppConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

/** Loads the session (if any) into res.locals.auth. Invalid or expired cookies are cleared. */
export function loadSession(sessions: SessionService, config: AppConfig): RequestHandler {
  return async (req, res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string' && token.length > 0 && token.length < 200) {
      const auth = await sessions.resolve(token);
      if (auth) res.locals.auth = auth;
      else res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(config), maxAge: undefined });
    }
    next();
  };
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection for cookie-authenticated requests:
 * 1. State-changing requests that carry an Origin header must come from WEB_ORIGIN.
 * 2. Requests made with a session must echo the session's CSRF token in X-CSRF-Token.
 * SameSite=Lax cookies are a further layer.
 */
export function csrfProtection(config: AppConfig): RequestHandler {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get('origin');
    if (origin && origin !== config.webOrigin) {
      return next(new AppError(403, 'CSRF_INVALID', 'Request origin not allowed'));
    }

    const auth = res.locals.auth;
    if (auth) {
      const header = req.get(CSRF_HEADER);
      if (!header || !safeEqual(header, auth.csrfToken)) {
        return next(
          new AppError(
            403,
            'CSRF_INVALID',
            'Missing or invalid CSRF token. Refresh and try again.',
          ),
        );
      }
    }
    next();
  };
}

export const requireAuth: RequestHandler = (_req, res, next) => {
  if (!res.locals.auth) return next(AppError.unauthenticated());
  next();
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (_req, res, next) => {
    const auth = res.locals.auth;
    if (!auth) return next(AppError.unauthenticated());
    if (!roles.includes(auth.user.role)) return next(AppError.forbidden());
    next();
  };
}

/** Narrow helper for handlers behind requireAuth. */
export function authOf(locals: { auth?: AuthContext }) {
  if (!locals.auth) throw AppError.unauthenticated();
  return locals.auth;
}
