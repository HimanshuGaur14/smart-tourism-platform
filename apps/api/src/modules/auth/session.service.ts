import type { Db } from '../../lib/prisma.js';
import { randomToken, sha256 } from '../../lib/crypto.js';
import type { AuthContext } from './auth.types.js';

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Opaque server-side sessions. The cookie holds a random token; the database stores only
 * its SHA-256 hash, so a database leak does not expose usable session tokens.
 */
export function createSessionService(db: Db) {
  return {
    async create(userId: string) {
      const token = randomToken();
      const csrfToken = randomToken();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await db.session.create({ data: { id: sha256(token), userId, csrfToken, expiresAt } });
      return { token, csrfToken, expiresAt };
    },

    async resolve(token: string): Promise<AuthContext | null> {
      const id = sha256(token);
      const session = await db.session.findUnique({
        where: { id },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      });
      if (!session) return null;
      if (session.expiresAt.getTime() <= Date.now()) {
        await db.session.deleteMany({ where: { id } });
        return null;
      }
      return { user: session.user, sessionId: id, csrfToken: session.csrfToken };
    },

    async revoke(sessionId: string) {
      await db.session.deleteMany({ where: { id: sessionId } });
    },

    async revokeAllForUser(userId: string) {
      await db.session.deleteMany({ where: { userId } });
    },
  };
}
export type SessionService = ReturnType<typeof createSessionService>;
