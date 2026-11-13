import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, buildQueryString } from '@/lib/api/client';
import { CSRF_HEADER } from '@/lib/api/constants';
import { ApiError } from '@/lib/api/errors';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('ApiClient singleton', () => {
  beforeEach(() => ApiClient.resetInstance());

  it('always returns the same instance', () => {
    expect(ApiClient.getInstance()).toBe(ApiClient.getInstance());
  });

  it('creates a fresh instance after a reset', () => {
    const first = ApiClient.getInstance();
    ApiClient.resetInstance();
    expect(ApiClient.getInstance()).not.toBe(first);
  });
});

describe('buildQueryString', () => {
  it('drops empty values and repeats arrays', () => {
    expect(buildQueryString({ a: 1, b: '', c: null, d: undefined, e: ['x', 'y'], f: false })).toBe('?a=1&e=x&e=y&f=false');
  });

  it('returns an empty string without parameters', () => {
    expect(buildQueryString()).toBe('');
    expect(buildQueryString({ a: undefined })).toBe('');
  });
});

describe('ApiClient.request', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    ApiClient.resetInstance();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('calls the BFF with the CSRF header and a JSON body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    const result = await ApiClient.getInstance().post('backend/clients', { firstName: 'Nour' }, { query: { page: 2 } });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/backend/clients?page=2');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers[CSRF_HEADER]).toBe('1');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ firstName: 'Nour' });
  });

  it('sends FormData untouched (browser sets the multipart boundary)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));
    const form = new FormData();
    form.append('avatar', 'x');
    await ApiClient.getInstance().post('backend/employees/upload-avatar', form);

    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(form);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('maps backend errors to ApiError with a French message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Invalid credentials', message: 'Email or password is incorrect' }));
    const error = (await ApiClient.getInstance().post('session', {}).catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.message).toBe('Email ou mot de passe incorrect.');
  });

  it('notifies unauthorized listeners on 401 and lets them unsubscribe', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Unauthorized' }));
    const client = ApiClient.getInstance();
    const listener = vi.fn();
    const unsubscribe = client.onUnauthorized(listener);

    await client.get('backend/clients').catch(() => undefined);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await client.get('backend/clients').catch(() => undefined);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('turns a network failure into a status 0 ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const error = (await ApiClient.getInstance().get('backend/clients').catch((e: unknown) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.isNetwork).toBe(true);
  });

  it('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(ApiClient.getInstance().delete('session')).resolves.toBeUndefined();
  });
});
