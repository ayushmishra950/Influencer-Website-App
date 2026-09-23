import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const TOKEN_KEY = 'aura.token';

/**
 * Resolves the API origin for whichever device is running the app.
 *
 * A physical phone cannot reach the laptop on `localhost`, so in development we
 * reuse the host that Expo itself is being served from. Set `EXPO_PUBLIC_API_URL`
 * to override (required for a real build).
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:5050`;

  // Android emulators reach the host machine on 10.0.2.2, not 127.0.0.1.
  return Platform.OS === 'android' ? 'http://10.0.2.2:5050' : 'http://localhost:5050';
}

export const API_BASE_URL = resolveBaseUrl();

export const tokenStore = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Query params; undefined and '' entries are dropped. */
  params?: Record<string, string | number | undefined>;
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, auth = true, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = await tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, params), {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    // Name the address that failed: on a phone this is usually the wrong host,
    // not a stopped server, and the URL is the only way to tell those apart.
    throw new ApiError(
      0,
      `Cannot reach the API at ${API_BASE_URL}.\n\nStart it with "npm run dev" in the backend/ folder, or set EXPO_PUBLIC_API_URL in app/.env if the address is wrong.`,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; details?: { message: string }[] }
    | null;

  if (!response.ok) {
    const detail = payload?.details?.map((d) => d.message).join(', ');
    throw new ApiError(response.status, detail || payload?.message || 'Something went wrong');
  }

  return payload as T;
}

/** Multipart upload for the profile photo — fetch sets its own boundary header. */
export async function uploadImage(uri: string): Promise<string> {
  const token = await tokenStore.get();
  const name = uri.split('/').pop() ?? 'photo.jpg';
  const extension = name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mime = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';

  const form = new FormData();
  form.append('image', { uri, name, type: mime } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/influencer/profile/image`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Accept: 'application/json' },
    body: form,
  });

  const payload = (await response.json().catch(() => null)) as
    | { data?: { url: string }; message?: string }
    | null;

  if (!response.ok || !payload?.data?.url) {
    throw new ApiError(response.status, payload?.message ?? 'Upload failed');
  }
  return payload.data.url;
}

/** Turns a server-relative /uploads path into something <Image> can load. */
export function imageUrl(path?: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('file:') || path.startsWith('data:')) return path;
  return `${API_BASE_URL}${path}`;
}

export const errorMessage = (error: unknown, fallback = 'Something went wrong'): string =>
  error instanceof Error ? error.message : fallback;
