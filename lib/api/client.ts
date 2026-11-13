import { BFF_BASE, CSRF_HEADER } from './constants';
import { ApiError, toApiError } from './errors';

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue | QueryValue[]>;

export interface RequestOptions {
  query?: Query;
  /** Plain object (sent as JSON) or FormData (sent as multipart). */
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type UnauthorizedListener = () => void;

const DEFAULT_TIMEOUT_MS = 20_000;

export function buildQueryString(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    const values = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value === undefined || value === null || value === '') continue;
      params.append(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Single HTTP gateway of the app (singleton). Paths are relative to the app's
 * own `/api` routes: `session` for sign in, `backend/...` for the REZA API.
 * The BFF attaches the session token kept in an httpOnly cookie, so no token
 * ever lives in the browser JavaScript.
 */
export class ApiClient {
  private static instance: ApiClient | null = null;

  private readonly listeners = new Set<UnauthorizedListener>();

  private constructor(private readonly baseUrl: string) {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient(BFF_BASE);
    }
    return ApiClient.instance;
  }

  /** Test helper: forget the shared instance. */
  static resetInstance(): void {
    ApiClient.instance = null;
  }

  /** Called whenever the backend answers 401 (expired or revoked session). */
  onUnauthorized(listener: UnauthorizedListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get<T>(path: string, options?: Omit<RequestOptions, 'body'>) {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('POST', path, { ...options, body });
  }

  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('PUT', path, { ...options, body });
  }

  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  delete<T>(path: string, options?: RequestOptions) {
    return this.request<T>('DELETE', path, options);
  }

  async request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}/${path.replace(/^\/+/, '')}${buildQueryString(options.query)}`;
    const headers: Record<string, string> = { Accept: 'application/json', [CSRF_HEADER]: '1' };

    let body: BodyInit | undefined;
    if (options.body instanceof FormData) {
      body = options.body;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const forwardAbort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', forwardAbort);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
        credentials: 'same-origin',
        signal: controller.signal,
      });
    } catch (cause) {
      if (options.signal?.aborted) throw cause;
      if (controller.signal.aborted) {
        throw new ApiError(504, 'TIMEOUT', 'Le serveur met trop de temps à répondre.');
      }
      throw new ApiError(0, 'NETWORK', 'Connexion au serveur impossible. Vérifiez votre réseau.');
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', forwardAbort);
    }

    const payload = await readPayload(response);
    if (!response.ok) {
      if (response.status === 401) this.listeners.forEach((listener) => listener());
      throw toApiError(response.status, payload);
    }
    return payload as T;
  }
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const type = response.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return undefined;
    }
  }
  const text = await response.text();
  return text || undefined;
}

export const api = ApiClient.getInstance();
