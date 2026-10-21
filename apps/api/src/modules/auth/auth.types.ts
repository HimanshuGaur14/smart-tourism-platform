import type { UserRole } from '@smart-tourism/contracts';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
  csrfToken: string;
}

declare module 'express-serve-static-core' {
  interface Locals {
    /** Set by the session middleware when a valid session cookie is present. */
    auth?: AuthContext;
    valid: Record<string, unknown>;
  }
}
