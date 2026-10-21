import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Prepares the dedicated test database: applies migrations (non-destructive
 * `migrate deploy`) and runs the idempotent seed. Refuses to touch anything that
 * does not look like a test database.
 */
/** Printed as well as thrown: Vitest 5 can fail to print errors from global setup. */
function fail(message: string): never {
  console.error(`\n${message}\n`);
  throw new Error(message);
}

export default function setup() {
  const rootEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
  if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    fail(
      'TEST_DATABASE_URL is not set. Create a separate test database and add it to .env (see README).',
    );
  }
  const dbName = new URL(testUrl).pathname.slice(1);
  if (!/test/i.test(dbName) || testUrl === process.env.DATABASE_URL) {
    fail(
      `Refusing to use "${dbName}" for tests: the test database name must contain "test" and differ from DATABASE_URL.`,
    );
  }

  const cwd = fileURLToPath(new URL('..', import.meta.url));
  const env = { ...process.env, DATABASE_URL: testUrl };
  // On Windows npx is a .cmd file, which Node only runs through a shell.
  const run = (args: string[], step: string) => {
    try {
      execFileSync('npx', args, { cwd, env, stdio: 'pipe', shell: process.platform === 'win32' });
    } catch (err) {
      const out = err as { stderr?: Buffer; stdout?: Buffer };
      const detail = `${out.stderr?.toString() ?? ''}${out.stdout?.toString() ?? ''}`.trim();
      const message = `Test database setup failed while ${step}. Is PostgreSQL running and TEST_DATABASE_URL correct?\n${detail.slice(-2000)}`;
      fail(message);
    }
  };
  run(['prisma', 'migrate', 'deploy'], 'applying migrations');
  run(['tsx', 'prisma/seed.ts'], 'seeding');
}
