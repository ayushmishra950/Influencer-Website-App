import type { SortOrder } from 'mongoose';
import type { SortKey } from './schemas.js';

/** Maps the public `sort` query value onto a Mongoose sort spec. */
export function directorySort(key: SortKey): Record<string, SortOrder> {
  return key === 'name' ? { name: 1 } : { createdAt: -1 };
}
