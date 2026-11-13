'use client';

import { useEffect, useState } from 'react';
import { useUrlState } from './useUrlState';

/**
 * Runs a page action requested through the URL (`?action=new`), e.g. from the
 * quick create menu, then removes the parameter so a reload does not reopen it.
 */
export function useUrlAction(handlers: Record<string, () => void>) {
  const { get, set } = useUrlState();
  const action = get('action');
  const [handled, setHandled] = useState<string | null>(null);

  // Render time trigger (no effect cascade): each requested action runs once.
  if (action && handlers[action] && handled !== action) {
    setHandled(action);
    handlers[action]();
  }
  if (!action && handled) setHandled(null);

  useEffect(() => {
    if (action) set({ action: null });
  }, [action, set]);
}
