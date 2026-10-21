import { z } from 'zod';
import { dataEnvelope } from './common.js';
import { userRoleSchema } from './domain.js';

export const CSRF_HEADER = 'X-CSRF-Token';
export const SESSION_COOKIE = 'st_session';

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email,
  password: passwordSchema,
  /** Admin accounts cannot be self-registered. */
  role: z.enum(['TOURIST', 'VENDOR']).default('TOURIST'),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(128),
});
export type LoginInput = z.input<typeof loginSchema>;

export const publicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: userRoleSchema,
});
export type PublicUser = z.infer<typeof publicUserSchema>;

/** `csrfToken` must be echoed in the X-CSRF-Token header on state-changing requests. */
export const sessionSchema = z.object({
  user: publicUserSchema.nullable(),
  csrfToken: z.string().nullable(),
});
export type SessionInfo = z.infer<typeof sessionSchema>;
export const sessionResponseSchema = dataEnvelope(sessionSchema);
