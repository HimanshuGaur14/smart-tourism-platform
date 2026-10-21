import { buildConfig, loadRootEnvFile } from './config/env.js';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { createPrismaClient } from './lib/prisma.js';

loadRootEnvFile();
const config = buildConfig(process.env);
const logger = createLogger(config);
const db = createPrismaClient(config.databaseUrl);
const app = createApp({ config, logger, db });

const server = app.listen(config.port, () => {
  logger.info(`API listening on http://localhost:${config.port} (CORS origin ${config.webOrigin})`);
});

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    void db.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
