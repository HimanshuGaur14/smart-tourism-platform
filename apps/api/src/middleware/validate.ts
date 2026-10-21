import type { RequestHandler } from 'express';
import type { z } from 'zod';

type Schemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

/**
 * Validates request parts with Zod. Parsed values are stored on `res.locals.valid`
 * (Express 5 makes `req.query` read-only). Zod errors reach the central error handler.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, res, next) => {
    const valid: Record<string, unknown> = {};
    if (schemas.params) valid.params = schemas.params.parse(req.params);
    if (schemas.query) valid.query = schemas.query.parse(req.query);
    if (schemas.body) valid.body = schemas.body.parse(req.body);
    res.locals.valid = valid;
    next();
  };
}
