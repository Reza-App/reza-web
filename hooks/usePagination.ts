'use client';

import { useMemo, useState } from 'react';
import { clampPage, DEFAULT_PAGE_SIZE, totalPagesFor } from '@/lib/pagination';

/**
 * Client side pagination for lists the API returns in full (statistics,
 * invoices, cash entries...). When `resetKey` changes (a filter or a search),
 * the list goes back to its first page.
 */
export function usePagination<T>(items: readonly T[], pageSize = DEFAULT_PAGE_SIZE, resetKey: unknown = null) {
  const [page, setPage] = useState(1);
  const [lastKey, setLastKey] = useState(resetKey);

  // Render time reset (no effect): a new filter starts on page 1.
  if (!Object.is(lastKey, resetKey)) {
    setLastKey(resetKey);
    setPage(1);
  }

  const totalPages = totalPagesFor(items.length, pageSize);
  const current = clampPage(page, totalPages);
  const offset = (current - 1) * pageSize;
  const pageItems = useMemo(() => items.slice(offset, offset + pageSize), [items, offset, pageSize]);

  /** For printable lists: every row is rendered, rows of other pages are only hidden on screen. */
  const rowClass = (index: number) => (index >= offset && index < offset + pageSize ? '' : 'hidden print:table-row');

  return { page: current, setPage, totalPages, pageItems, offset, total: items.length, pageSize, rowClass };
}
