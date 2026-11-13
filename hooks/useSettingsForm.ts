'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { errorMessage } from '@/lib/api/errors';
import { useApiQuery } from './useApiQuery';

interface EditState<T> {
  /** Stored value the draft was copied from. */
  base: T | undefined;
  draft: T | undefined;
}

/**
 * Settings page state: loads the stored value, keeps an editable draft,
 * tells whether it changed and saves it back.
 */
export function useSettingsForm<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  save: (draft: T) => Promise<unknown>,
  successMessage = 'Modifications enregistrées.',
) {
  const toast = useToast();
  const query = useApiQuery(key, load);
  const [edit, setEdit] = useState<EditState<T>>({ base: undefined, draft: undefined });
  const [saving, setSaving] = useState(false);

  // New data from the server: restart the draft from it (render time reset,
  // the React pattern for state derived from a changing value).
  if (query.data !== edit.base) {
    setEdit({ base: query.data, draft: query.data === undefined ? undefined : structuredClone(query.data) });
  }

  const setDraft = useCallback((update: T | undefined | ((current: T | undefined) => T | undefined)) => {
    setEdit((e) => ({ ...e, draft: typeof update === 'function' ? (update as (c: T | undefined) => T | undefined)(e.draft) : update }));
  }, []);

  const draft = edit.draft;
  const dirty = draft !== undefined && JSON.stringify(draft) !== JSON.stringify(query.data);

  const submit = useCallback(async () => {
    if (draft === undefined) return;
    setSaving(true);
    try {
      await save(draft);
      query.setData(structuredClone(draft));
      toast.success(successMessage);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [draft, save, query, toast, successMessage]);

  const reset = useCallback(() => {
    setEdit((e) => ({ ...e, draft: e.base === undefined ? undefined : structuredClone(e.base) }));
  }, []);

  return { query, draft, setDraft, dirty, saving, submit, reset };
}
