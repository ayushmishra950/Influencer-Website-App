import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError.js';

type Source = 'body' | 'params' | 'query';

/**
 * Validates a request segment. Parsed output replaces `req.body`/`req.params`;
 * query results land on `req.validatedQuery` because `req.query` is read-only in Express 5.
 */
export const validate =
  (schema: ZodSchema, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };

/** Typed accessor for the result of `validate(schema, 'query')`. */
export const getQuery = <T>(req: { validatedQuery?: unknown }): T => req.validatedQuery as T;
