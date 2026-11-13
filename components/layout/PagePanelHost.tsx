'use client';

import { createContext, useCallback, useContext, useState } from 'react';

/**
 * Create and edit forms open as a page of their own: while one is open, the
 * page content (list, calendar...) is hidden but stays mounted, so going back
 * returns to the list exactly as it was (filters, scroll, pagination).
 */
interface PanelHost {
  slot: HTMLElement | null;
  /** Marks a form as open; returns the function that marks it closed. */
  acquire: () => () => void;
}

const PagePanelContext = createContext<PanelHost>({ slot: null, acquire: () => () => undefined });

export function PagePanelHost({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const [openCount, setOpenCount] = useState(0);

  const acquire = useCallback(() => {
    setOpenCount((n) => n + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setOpenCount((n) => Math.max(0, n - 1));
    };
  }, []);

  return (
    <PagePanelContext.Provider value={{ slot, acquire }}>
      <div ref={setSlot} />
      <div hidden={openCount > 0}>{children}</div>
    </PagePanelContext.Provider>
  );
}

export function usePagePanel(): PanelHost {
  return useContext(PagePanelContext);
}
