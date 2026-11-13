'use client';

import { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { fieldClass } from '@/components/ui/modal';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useDebounce } from '@/hooks/useDebounce';
import { clientService } from '@/lib/api/services/catalog.service';
import { personName } from '@/lib/format';
import type { Client } from '@/lib/types/catalog';

/** Live client search (server side) with an optional "create" entry. */
export function ClientSearch({
  selected,
  onSelect,
  onCreate,
  autoFocus,
}: {
  selected: Client | null;
  onSelect: (client: Client | null) => void;
  /** Receives what was typed, to prefill a new client. */
  onCreate?: (typed: string) => void;
  autoFocus?: boolean;
}) {
  const [search, setSearch] = useState('');
  const term = useDebounce(search.trim(), 300);
  const results = useApiQuery(term.length >= 2 && !selected ? `client-search:${term}` : null, (signal) =>
    clientService.list({ search: term, limit: 8 }, signal),
  );

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-neutral-950">{personName(selected)}</p>
          <p className="text-xs text-neutral-500">{[selected.phone, selected.email].filter(Boolean).join(' · ')}</p>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="rounded-full p-1.5 text-neutral-400 hover:bg-white hover:text-neutral-950" aria-label="Changer de client">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search size={16} className="absolute left-4 top-3 text-neutral-400" />
      <input
        className={`${fieldClass} pl-10`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nom, téléphone ou email"
        aria-label="Rechercher un client"
        autoFocus={autoFocus}
      />
      {term.length >= 2 && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
          {results.loading && <p className="px-4 py-3 text-sm text-neutral-500">Recherche...</p>}
          {results.data?.clients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => onSelect(client)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-neutral-50"
            >
              <span className="font-medium text-neutral-950">{personName(client)}</span>
              <span className="text-xs text-neutral-500">{client.phone}</span>
            </button>
          ))}
          {!results.loading && results.data?.clients.length === 0 && <p className="px-4 py-3 text-sm text-neutral-500">Aucun client trouvé.</p>}
          {onCreate && (
            <button
              type="button"
              onClick={() => onCreate(search.trim())}
              className="flex w-full items-center gap-2 border-t border-neutral-100 px-4 py-2.5 text-left text-sm font-medium text-neutral-950 hover:bg-neutral-50"
            >
              <Plus size={14} /> Créer un nouveau client
            </button>
          )}
        </div>
      )}
    </div>
  );
}
