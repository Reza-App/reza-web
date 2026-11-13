'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/api/errors';

export interface ApiQueryState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  /** Re-run the request with the current key. */
  refetch: () => Promise<void>;
  /** Local update after a mutation, without a round trip. */
  setData: (update: T | undefined | ((current: T | undefined) => T | undefined)) => void;
}

interface Settled<T> {
  data: T | undefined;
  error: string | null;
  /** Key of the last request that finished. */
  key: string | null;
}

/**
 * Loads data for a page. The request re-runs whenever `key` changes (put the
 * filters in it); a `null` key skips the request. Stale responses are
 * dropped and in-flight requests are aborted on change or unmount. The
 * previous data stays visible while the next key loads.
 */
export function useApiQuery<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
): ApiQueryState<T> {
  const [settled, setSettled] = useState<Settled<T>>({ data: undefined, error: null, key: null });
  const [refreshing, setRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (requestKey: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await fetcherRef.current(controller.signal);
      if (!controller.signal.aborted) setSettled({ data: result, error: null, key: requestKey });
    } catch (err) {
      if (!controller.signal.aborted) setSettled((s) => ({ ...s, error: errorMessage(err), key: requestKey }));
    } finally {
      if (!controller.signal.aborted) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (key === null) return;
    void load(key);
    return () => controllerRef.current?.abort();
  }, [key, load]);

  const refetch = useCallback(async () => {
    if (key === null) return;
    setRefreshing(true);
    await load(key);
  }, [key, load]);

  const setData = useCallback((update: T | undefined | ((current: T | undefined) => T | undefined)) => {
    setSettled((s) => ({ ...s, data: typeof update === 'function' ? (update as (c: T | undefined) => T | undefined)(s.data) : update }));
  }, []);

  const current = key !== null && settled.key === key;
  return {
    data: settled.data,
    error: current ? settled.error : null,
    loading: key !== null && (!current || refreshing),
    refetch,
    setData,
  };
}
