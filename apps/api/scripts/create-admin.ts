/**
 * Creates or promotes an admin account. Credentials come from environment variables so they
 * never appear in source control. See README "Accounts" for macOS/Linux and Windows syntax.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hash } from 'argon2';
import { loginSchema, passwordSchema } from '@smart-tourism/contracts';
import { ARGON2_OPTIONS } from '../src/modules/auth/auth.router.js';
import { createPrismaClient } from '../src/lib/prisma.js';

const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const email = loginSchema.shape.email.safeParse(process.env.ADMIN_EMAIL);
const password = passwordSchema.safeParse(process.env.ADMIN_PASSWORD);
if (!process.env.DATABASE_URL || !email.success || !password.success) {
  console.error('Set DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD (10+ characters).');
  process.exit(1);
}

const prisma = createPrismaClient(process.env.DATABASE_URL);
const passwordHash = await hash(password.data, ARGON2_OPTIONS);
const user = await prisma.user.upsert({
  where: { email: email.data },
  update: { role: 'ADMIN', passwordHash },
  create: {
    email: email.data,
    name: process.env.ADMIN_NAME ?? 'Administrator',
    role: 'ADMIN',
    passwordHash,
  },
});
// Existing sessions are revoked because the password changed.
await prisma.session.deleteMany({ where: { userId: user.id } });
console.warn(`Admin account ready: ${user.email}`);
await prisma.$disconnect();
