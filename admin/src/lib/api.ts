import axios, { AxiosError } from 'axios';

const TOKEN_KEY = 'aura.admin.token';

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({
  // Empty in dev: Vite proxies /api to the backend, so there is one origin and no CORS.
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** An expired or revoked token should drop the session rather than loop on 401s. */
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isAuthCall = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isAuthCall) {
      tokenStore.clear();
      if (!location.pathname.startsWith('/login')) location.assign('/login');
    }
    return Promise.reject(error);
  },
);

interface ApiErrorBody {
  message?: string;
  details?: { field: string; message: string }[];
}

const API_ORIGIN = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

/**
 * Two different outages look nothing alike from the browser, and neither one is
 * self-explanatory, so each gets its own message naming the thing to restart:
 *
 *  - Vite is down     -> the request never leaves the browser (ERR_NETWORK).
 *  - Backend is down  -> Vite's proxy answers 500 with an empty body.
 *
 * A genuine 500 from Express always carries a JSON `message`, which is how the
 * second case is told apart from a real server error.
 */
function connectionHint(error: AxiosError): string | null {
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
    return `Cannot reach the dev server at ${location.origin}. Start it with "npm run dev" in the admin/ folder.`;
  }

  const status = error.response?.status;
  const body = error.response?.data as ApiErrorBody | string | undefined;
  const hasServerMessage = typeof body === 'object' && body !== null && 'message' in body;

  if (status && [500, 502, 503, 504].includes(status) && !hasServerMessage) {
    return `The API is not responding at ${API_ORIGIN}. Start it with "npm run dev" in the backend/ folder.`;
  }

  return null;
}

/** Turns any thrown value into a message worth showing a person. */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof AxiosError) {
    const hint = connectionHint(error);
    if (hint) return hint;

    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.details?.length) {
      return body.details.map((d) => d.message).join(', ');
    }
    if (body?.message) return body.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
