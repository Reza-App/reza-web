import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useApiQuery } from '@/hooks/useApiQuery';
import { invalidate, memoize } from '@/lib/api/memo';
import { ApiError } from '@/lib/api/errors';

describe('useApiQuery', () => {
  it('loads data and exposes loading state', async () => {
    const { result } = renderHook(() => useApiQuery('k', async () => 42));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe(42);
    expect(result.current.error).toBeNull();
  });

  it('exposes a readable error message', async () => {
    const { result } = renderHook(() =>
      useApiQuery('k', async () => {
        throw new ApiError(500, 'X', 'Erreur serveur');
      }),
    );
    await waitFor(() => expect(result.current.error).toBe('Erreur serveur'));
  });

  it('skips the request when the key is null', async () => {
    const fetcher = vi.fn(async () => 1);
    const { result } = renderHook(() => useApiQuery(null, fetcher));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('re-runs when the key changes and aborts the previous request', async () => {
    const signals: AbortSignal[] = [];
    const { result, rerender } = renderHook(({ k }) => useApiQuery(k, async (signal) => {
      signals.push(signal);
      return k;
    }), { initialProps: { k: 'a' } });
    await waitFor(() => expect(result.current.data).toBe('a'));
    rerender({ k: 'b' });
    await waitFor(() => expect(result.current.data).toBe('b'));
    expect(signals[0].aborted).toBe(true);
  });

  it('refetches on demand', async () => {
    let n = 0;
    const { result } = renderHook(() => useApiQuery('k', async () => ++n));
    await waitFor(() => expect(result.current.data).toBe(1));
    await act(() => result.current.refetch());
    expect(result.current.data).toBe(2);
  });
});

describe('memoize', () => {
  it('shares one request between concurrent callers', async () => {
    invalidate();
    const load = vi.fn(async () => 'v');
    const [a, b] = await Promise.all([memoize('x', 1000, load), memoize('x', 1000, load)]);
    expect(a).toBe('v');
    expect(b).toBe('v');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads after invalidation and does not cache failures', async () => {
    invalidate();
    const load = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue('ok');
    await expect(memoize('y', 1000, load)).rejects.toThrow('boom');
    await expect(memoize('y', 1000, load)).resolves.toBe('ok');
    invalidate('y');
    await memoize('y', 1000, load);
    expect(load).toHaveBeenCalledTimes(3);
  });
});
