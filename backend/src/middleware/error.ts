import type { ErrorRequestHandler, RequestHandler } from 'express';
import { MongoServerError } from 'mongodb';
import mongoose from 'mongoose';
import { ApiError, type FieldIssue } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let message = 'Something went wrong';
  let details: FieldIssue[] | undefined;

  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
    details = err.details;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err instanceof MongoServerError && err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'value';
    message = `An account with this ${field} already exists`;
  } else if (err instanceof Error) {
    // Multer surfaces upload problems (e.g. LIMIT_FILE_SIZE) as plain errors.
    if ('code' in err && err.code === 'LIMIT_FILE_SIZE') {
      status = 400;
      message = 'Image must be smaller than 4 MB';
    } else {
      message = isProd ? message : err.message;
    }
  }

  if (status >= 500) console.error('[error]', err);

  // Never let a failure inherit a cache header. express.static sets
  // "max-age=31536000, immutable" *before* it streams a file, so a send that fails
  // part-way (a file briefly missing during a deploy, say) would otherwise hand the
  // browser a 500 it keeps for a year -- and the page stays broken long after the
  // server is healthy again, with a cache clear the only way out.
  res.setHeader('Cache-Control', 'no-store');

  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(!isProd && status >= 500 && err instanceof Error ? { stack: err.stack } : {}),
  });
};
