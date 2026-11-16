'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Footprints, Plus, Search, UserRound, X } from 'lucide-react';
import { fieldClass } from '@/components/ui/modal';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebounce } from '@/hooks/useDebounce';
import { clientService } from '@/lib/api/services/catalog.service';
import { personName } from '@/lib/format';
import type { Client } from '@/lib/types/catalog';

type Item =
  | { kind: 'client'; client: Client }
  | { kind: 'create'; typed: string }
  | { kind: 'walkin'; typed: string };

/**
 * Client picker: a dropdown that lists clients as soon as it opens (recent
 * first) and narrows them while typing (name, phone or email). The bottom
 * entries create a client file from what was typed, or book a walk in client
 * with only a name (no file). Arrows, Enter and Escape work as in a select.
 */
export function ClientSearch({
  selected,
  onSelect,
  onCreate,
  onWalkIn,
  walkInName,
  onClearWalkIn,
  autoFocus,
}: {
  selected: Client | null;
  onSelect: (client: Client | null) => void;
  /** Receives what was typed, to prefill a new client file. */
  onCreate?: (typed: string) => void;
  /** Receives the typed name to book without a client file. */
  onWalkIn?: (name: string) => void;
  walkInName?: string | null;
  onClearWalkIn?: () => void;
  autoFocus?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const term = useDebounce(search.trim(), 250);
  const showList = open && !selected && !walkInName;

  const results = useApiQuery(showList ? `client-picker:${term}` : null, (signal) =>
    clientService.list({ search: term || undefined, limit: 8 }, signal),
  );

  const typed = search.trim();
  const items: Item[] = [
    ...(results.data?.clients ?? []).map((client) => ({ kind: 'client' as const, client })),
    ...(onCreate ? [{ kind: 'create' as const, typed }] : []),
    ...(onWalkIn && typed ? [{ kind: 'walkin' as const, typed }] : []),
  ];

  // A new result set starts on its first entry.
  const [lastTerm, setLastTerm] = useState(term);
  if (lastTerm !== term) {
    setLastTerm(term);
    setActive(0);
  }

  useEffect(() => {
    if (!showList) return;
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showList]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    if (item.kind === 'client') onSelect(item.client);
    if (item.kind === 'create') onCreate?.(item.typed);
    if (item.kind === 'walkin') onWalkIn?.(item.typed);
    setSearch('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && showList) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (selected || walkInName) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-600">
            {walkInName ? <Footprints size={16} /> : <UserRound size={16} />}
          </span>
          <div>
            <p className="text-sm font-medium text-neutral-950">{selected ? personName(selected) : walkInName}</p>
            <p className="text-xs text-neutral-500">
              {selected ? [selected.phone, selected.email].filter(Boolean).join(' · ') : 'Client de passage, sans fiche client'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => (selected ? onSelect(null) : onClearWalkIn?.())}
          className="rounded-full p-1.5 text-neutral-400 hover:bg-white hover:text-neutral-950"
          aria-label="Changer de client"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        className={`${fieldClass} pl-10 pr-10`}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Choisir ou rechercher un client (nom, téléphone, email)"
        aria-label="Client"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        name="selia-client-picker"
        autoFocus={autoFocus}
      />
      <ChevronDown size={16} className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 transition-transform ${showList ? 'rotate-180' : ''}`} />

      {showList && (
        <ul id={listId} role="listbox" className="animate-fadeUp absolute z-30 mt-1.5 max-h-80 w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-xl">
          {results.loading && !results.data && <li className="px-3 py-2.5 text-sm text-neutral-500">Chargement des clients...</li>}
          {!results.loading && (results.data?.clients ?? []).length === 0 && (
            <li className="px-3 py-2.5 text-sm text-neutral-500">{typed ? `Aucun client pour « ${typed} ».` : 'Aucun client enregistré.'}</li>
          )}
          {!typed && (results.data?.clients ?? []).length > 0 && (
            <li className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400" aria-hidden>
              Clients récents
            </li>
          )}
          {items.map((item, i) => {
            const on = i === active;
            const base = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${on ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`;
            if (item.kind === 'client') {
              return (
                <li key={item.client.id} role="option" aria-selected={on}>
                  <button type="button" onMouseEnter={() => setActive(i)} onClick={() => choose(item)} className={base}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-[11px] font-semibold text-white">
                      {(item.client.firstName?.[0] ?? '') + (item.client.lastName?.[0] ?? '')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-neutral-950">{personName(item.client)}</span>
                      <span className="block truncate text-xs text-neutral-500">{[item.client.phone, item.client.email].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                </li>
              );
            }
            return (
              <li key={item.kind} role="option" aria-selected={on} className={item.kind === 'create' ? 'mt-1 border-t border-neutral-100 pt-1' : ''}>
                <button type="button" onMouseEnter={() => setActive(i)} onClick={() => choose(item)} className={`${base} font-medium text-neutral-950`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-300">
                    {item.kind === 'create' ? <Plus size={15} /> : <Footprints size={15} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">
                      {item.kind === 'create' ? (item.typed ? `Créer le client « ${item.typed} »` : 'Ajouter un nouveau client') : `Client de passage : « ${item.typed} »`}
                    </span>
                    <span className="block text-xs font-normal text-neutral-500">
                      {item.kind === 'create' ? 'Enregistré dans votre fichier client' : 'Juste un nom, sans créer de fiche'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
