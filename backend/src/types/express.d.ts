import type { HydratedDocument } from 'mongoose';
import type { IUser } from '../models/User.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. */
      user?: HydratedDocument<IUser>;
      /** Set by `validate(schema, 'query')` — req.query itself is read-only in Express 5. */
      validatedQuery?: unknown;
    }
  }
}

export {};
