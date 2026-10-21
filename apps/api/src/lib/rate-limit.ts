import type { RequestHandler } from 'express';
import { AppError } from './errors.js';

/**
 * Small fixed-window, in-memory rate limiter (single process). Good enough for local
 * development and a single instance; use a shared store if the API is scaled out.
 */
export function rateLimit({
  windowMs,
  max,
  key,
}: {
  windowMs: number;
  max: number;
  key: (req: Parameters<RequestHandler>[0]) => string;
}): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const now = Date.now();
    const k = key(req);
    const entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      hits.set(k, { count: 1, resetAt: now + windowMs });
      if (hits.size > 10_000) {
        for (const [key, value] of hits) if (value.resetAt <= now) hits.delete(key);
      }
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(
        new AppError(429, 'RATE_LIMITED', 'Too many attempts. Please wait and try again.'),
      );
    }
    next();
  };
}
