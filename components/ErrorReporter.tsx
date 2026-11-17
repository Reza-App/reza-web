'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/errorReport';

/** Reports uncaught browser errors and rejected promises (no UI). */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Resource loading errors and browser extension noise carry no error object.
      if (e.error) reportError(e.error);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      // Aborted requests (page change) are expected, not crashes.
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      if (reason instanceof Error) reportError(reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
