'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/errorReport';

/** The root layout itself crashed: minimal page with its own html and body. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0, background: '#fff', color: '#0a0a0a' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 500 }}>Un problème est survenu</h1>
          <p style={{ color: '#525252', fontSize: 14 }}>L&apos;équipe Selia a été prévenue.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, borderRadius: 999, background: '#0a0a0a', color: '#fff', border: 0, padding: '10px 20px', cursor: 'pointer' }}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
