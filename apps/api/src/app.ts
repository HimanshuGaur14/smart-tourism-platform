import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { API_PREFIX } from '@smart-tourism/contracts';
import type { AppConfig } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import type { Db } from './lib/prisma.js';
import { csrfProtection, loadSession } from './middleware/auth.js';
import { adminRouter } from './modules/admin/admin.router.js';
import { analyticsRouter } from './modules/analytics/analytics.router.js';
import { createAnalyticsService } from './modules/analytics/analytics.service.js';
import { authRouter } from './modules/auth/auth.router.js';
import { createSessionService } from './modules/auth/session.service.js';
import {
  enquiriesRouter,
  myEnquiriesRouter,
  vendorEnquiriesRouter,
} from './modules/enquiries/enquiries.router.js';
import { createEnquiriesService } from './modules/enquiries/enquiries.service.js';
import { forecastsRouter } from './modules/forecasts/forecasts.router.js';
import { listingsRouter, myListingsRouter } from './modules/listings/listings.router.js';
import { createListingsService } from './modules/listings/listings.service.js';
import { createForecastService, type ForecastService } from './services/forecast/index.js';
import {
  categoriesRouter,
  createCategoriesService,
} from './modules/categories/categories.router.js';
import { destinationsRouter } from './modules/destinations/destinations.router.js';
import { createDestinationsService } from './modules/destinations/destinations.service.js';
import { itinerariesRouter, savedDestinationsRouter } from './modules/trips/trips.router.js';
import { healthRouter } from './modules/health/health.router.js';

export interface AppDeps {
  config: AppConfig;
  logger: Logger;
  db: Db;
  /** Defaults to the provider selected by FORECAST_PROVIDER. Tests may inject one. */
  forecasts?: ForecastService;
}

export function createApp({
  config,
  logger,
  db,
  forecasts = createForecastService(config, logger),
}: AppDeps): Express {
  const app = express();

  app.disable('x-powered-by');
  // Trust the first proxy hop in production so Secure cookies work behind TLS termination.
  if (config.isProduction) app.set('trust proxy', 1);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === `${API_PREFIX}/health` },
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: config.webOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const sessions = createSessionService(db);
  const listings = createListingsService(db);
  const enquiries = createEnquiriesService(db);

  const api = express.Router();
  api.use(loadSession(sessions, config));
  api.use(csrfProtection(config));
  api.use('/health', healthRouter(config, db));
  api.use('/destinations', destinationsRouter(createDestinationsService(db)));
  api.use('/categories', categoriesRouter(createCategoriesService(db)));
  api.use('/auth', authRouter(db, sessions, config));
  api.use('/listings', listingsRouter(listings));
  api.use('/enquiries', enquiriesRouter(enquiries, config));
  api.use('/me/enquiries', myEnquiriesRouter(enquiries));
  api.use('/me/listings', myListingsRouter(listings));
  api.use('/me/saved-destinations', savedDestinationsRouter(db));
  api.use('/me/itineraries', itinerariesRouter(db));
  api.use('/vendor/enquiries', vendorEnquiriesRouter(enquiries));
  api.use('/forecasts', forecastsRouter(db, forecasts));
  api.use('/analytics', analyticsRouter(createAnalyticsService(db), forecasts));
  api.use('/admin', adminRouter(db));
  app.use(API_PREFIX, api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
