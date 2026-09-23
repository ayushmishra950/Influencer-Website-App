import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async handler so a rejected promise reaches the error middleware. */
export const asyncHandler =
  (fn: AsyncRouteHandler): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
