/** Default number of rows shown per page in dashboard lists. */
export const DEFAULT_PAGE_SIZE = 10;

export function totalPagesFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, pageSize)));
}

/** Keeps a requested page inside [1, totalPages]. */
export function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.trunc(page)), Math.max(1, totalPages));
}

/**
 * Page numbers to display, with 'gap' where pages are skipped:
 * 1 … 4 5 6 … 12. Always shows the first, the last and the neighbours
 * of the current page.
 */
export function pageRange(page: number, totalPages: number, siblings = 1): (number | 'gap')[] {
  const current = clampPage(page, totalPages);
  // Few pages: show them all.
  if (totalPages <= 5 + siblings * 2) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const start = Math.max(2, current - siblings);
  const end = Math.min(totalPages - 1, current + siblings);
  const range: (number | 'gap')[] = [1];
  if (start > 2) range.push('gap');
  for (let p = start; p <= end; p += 1) range.push(p);
  if (end < totalPages - 1) range.push('gap');
  range.push(totalPages);
  return range;
}
