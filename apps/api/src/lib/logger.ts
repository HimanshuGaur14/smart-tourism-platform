import { pino, type Logger } from 'pino';
import type { AppConfig } from '../config/env.js';

export function createLogger(config: AppConfig): Logger {
  return pino({
    level: config.logLevel,
    redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    ...(config.env === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } } }
      : {}),
  });
}
