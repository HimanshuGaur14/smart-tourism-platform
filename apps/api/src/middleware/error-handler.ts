import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiError } from '@smart-tourism/contracts';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route ${req.method} ${req.path} not found`));
};

/** Prisma known request errors (unique, foreign key, not found) mapped to client errors. */
function prismaError(err: unknown): { status: number; body: ApiError['error'] } | null {
  if (
    typeof err !== 'object' ||
    err === null ||
    !('code' in err) ||
    (err as { name?: string }).name !== 'PrismaClientKnownRequestError'
  )
    return null;
  switch ((err as { code: string }).code) {
    case 'P2002':
      return {
        status: 409,
        body: { code: 'CONFLICT', message: 'A record with this value already exists' },
      };
    case 'P2003':
      return {
        status: 409,
        body: { code: 'CONFLICT', message: 'This record is still referenced by other data' },
      };
    case 'P2025':
      return { status: 404, body: { code: 'NOT_FOUND', message: 'Resource not found' } };
    default:
      return null;
  }
}

function isBodyParserError(err: unknown): err is { status: number; type: string } {
  return typeof err === 'object' && err !== null && 'type' in err && 'status' in err;
}

/** Converts any thrown error into the shared JSON error envelope. Never leaks stack traces. */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  const requestId =
    typeof req.id === 'string' || typeof req.id === 'number' ? String(req.id) : undefined;
  let status = 500;
  let body: ApiError['error'];

  if (err instanceof AppError) {
    status = err.status;
    body = { code: err.code, message: err.message, details: err.details };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  } else if (prismaError(err)) {
    ({ status, body } = prismaError(err)!);
  } else if (isBodyParserError(err) && err.status >= 400 && err.status < 500) {
    status = err.status;
    body = {
      code: 'BAD_REQUEST',
      message:
        err.type === 'entity.too.large' ? 'Request body too large' : 'Malformed request body',
    };
  } else {
    req.log?.error({ err }, 'Unhandled error');
    body = { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again later.' };
  }

  if (requestId) body.requestId = requestId;
  res.status(status).json({ error: body } satisfies ApiError);
};
