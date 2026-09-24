'use client';

import { API_URL } from './api';

const TOKEN_KEY = 'aura.site.token';

/**
 * Browser-side session storage.
 *
 * Every accessor is wrapped: a private window, or blocked site data, makes localStorage
 * throw rather than return null, and an auth helper that explodes takes the page with it.
 */
export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Nothing to do: the visitor stays signed in for this tab only.
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // As above.
    }
  },
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export class ClientApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ClientApiError';
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    // Name the address that failed — "something went wrong" sends people nowhere.
    throw new ClientApiError(0, `Cannot reach the server at ${API_URL}.`);
  }

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; details?: { field: string; message: string }[] }
    | null;

  if (!response.ok) {
    // A field-level message is more useful than the generic "Validation failed".
    const detail = payload?.details?.[0]?.message;
    throw new ClientApiError(response.status, detail || payload?.message || 'Something went wrong');
  }

  return payload as T;
}

export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;
