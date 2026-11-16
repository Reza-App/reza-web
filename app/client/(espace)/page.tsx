'use client';

import { Suspense, useMemo, useState } from 'react';
import Image from 'next/image';
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { SalonCard } from '@/components/client/SalonCard';
import { ScrollRow } from '@/components/client/ScrollRow';
import { Pagination } from '@/components/ui/page';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useApiQuery } from '@/hooks/useApiQuery';
import { usePagination } from '@/hooks/usePagination';
import { useUrlState } from '@/hooks/useUrlState';
import { discovery } from '@/lib/api/services/clientArea.service';
import { arrangeSalons, SALON_SORTS, type SalonSort } from '@/lib/clientSalon';

const PAGE_SIZE = 9;

function Discover() {
  const { get, set } = useUrlState();
  const { client } = useClientAuth();

  // The URL holds the applied filters (shareable, survives a reload); the
  // inputs are drafts copied from it whenever it changes.
  const q = get('q').trim();
  const city = get('ville').trim();
  const category = get('categorie');
  const sort = (SALON_SORTS.some((s) => s.value === get('tri')) ? get('tri') : 'pertinence') as SalonSort;
  const onlineOnly = get('enligne') === '1';

  const [draft, setDraft] = useState({ q, city });
  const [applied, setApplied] = useState(`${q}|${city}`);
  if (applied !== `${q}|${city}`) {
    setApplied(`${q}|${city}`);
    setDraft({ q, city });
  }
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categories = useApiQuery('client-categories', (signal) => discovery.categories(signal));
  // Every salon once, for the list of cities offered in the filters.
  const all = useApiQuery('client-salons-all', (signal) => discovery.salons({}, signal));
  const salons = useApiQuery(`client-salons:${q}:${city}:${category}`, (signal) =>
    discovery.salons({ search: q || undefined, city: city || undefined, categories: category || undefined }, signal),
  );

  const cities = useMemo(
    () => [...new Set((all.data ?? []).map((s) => s.city?.trim()).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'fr')),
    [all.data],
  );
  const list = useMemo(() => arrangeSalons(salons.data ?? [], sort, onlineOnly), [salons.data, sort, onlineOnly]);
  const pager = usePagination(list, PAGE_SIZE, `${q}|${city}|${category}|${sort}|${onlineOnly}`);

  const activeFilters = [city, sort !== 'pertinence', onlineOnly].filter(Boolean).length;
  const filtered = !!(q || city || category || onlineOnly || sort !== 'pertinence');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    set({ q: draft.q.trim() || null, ville: draft.city.trim() || null });
  };
  const showAll = () => {
    setDraft({ q: '', city: '' });
    set({ q: null, ville: null, categorie: null, tri: null, enligne: null });
  };

  return (
    <div className="space-y-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-neutral-950 px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-16">
        <Image
          src="/Images/auth/Salon Selia1.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 1216px, 100vw"
          className="-z-10 scale-125 object-cover object-[100%_70%] sm:scale-150 sm:object-[100%_75%]"
        />
        {/* Dark veil on the text side so the title and search stay readable. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/50 to-black/10" aria-hidden />
        <p className="text-sm text-white/75">{client ? `Bonjour ${client.firstName},` : 'Bienvenue sur Selia,'}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-medium leading-tight sm:text-5xl">Réservez votre moment beauté, en quelques clics.</h1>
        <form onSubmit={submit} className="mt-8 grid gap-3 rounded-3xl bg-white p-2 shadow-lg sm:grid-cols-[1.4fr_1fr_auto] sm:rounded-full">
          <label className="flex items-center gap-3 rounded-full px-4 py-2.5 text-neutral-950">
            <Search size={18} className="shrink-0 text-neutral-400" />
            <span className="sr-only">Prestation ou salon</span>
            <input
              value={draft.q}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              placeholder="Prestation, salon..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </label>
          <label className="flex items-center gap-3 rounded-full px-4 py-2.5 text-neutral-950 sm:border-l sm:border-neutral-200">
            <MapPin size={18} className="shrink-0 text-neutral-400" />
            <span className="sr-only">Ville</span>
            <input
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Ville"
              list="selia-cities"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
            <datalist id="selia-cities">
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <button type="submit" className="rounded-full bg-neutral-950 px-7 py-3 text-sm font-medium text-white hover:bg-neutral-800">
            Rechercher
          </button>
        </form>
      </section>

      <section aria-label="Filtres" className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              filtersOpen || activeFilters ? 'border-neutral-950 bg-neutral-950 text-white' : 'border-neutral-300 text-neutral-800 hover:border-neutral-950'
            }`}
          >
            <SlidersHorizontal size={16} /> Filtres
            {activeFilters > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs text-neutral-950">{activeFilters}</span>}
          </button>
          <ScrollRow label="Catégories" className="flex-1">
            <button
              type="button"
              onClick={() => set({ categorie: null })}
              className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${!category ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
            >
              Tout
            </button>
            {(categories.data ?? []).map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => set({ categorie: category === cat.name ? null : cat.name })}
                aria-pressed={category === cat.name}
                className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${category === cat.name ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
              >
                {cat.name}
              </button>
            ))}
          </ScrollRow>
        </div>

        {filtersOpen && (
          <div className="animate-fadeUp grid gap-5 rounded-3xl border border-neutral-200 p-5 sm:grid-cols-3 sm:p-6">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Ville</p>
              <Select value={city} onValueChange={(v) => set({ ville: v || null })} aria-label="Ville">
                <option value="">Toutes les villes</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">Trier par</p>
              <Select value={sort} onValueChange={(v) => set({ tri: v === 'pertinence' ? null : v })} aria-label="Trier par">
                {SALON_SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3">
              <span className="text-sm text-neutral-800">Réservation en ligne uniquement</span>
              <Switch checked={onlineOnly} onChange={(v) => set({ enligne: v ? '1' : null })} label="Réservation en ligne uniquement" />
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-medium text-neutral-950">{filtered ? 'Résultats' : 'Salons à découvrir'}</h2>
            {filtered && (
              <p className="mt-1 text-sm text-neutral-500">
                {[q && `« ${q} »`, city, category, onlineOnly && 'en ligne'].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {salons.data && (
              <p className="text-sm text-neutral-500">
                {list.length} salon{list.length > 1 ? 's' : ''}
              </p>
            )}
            {filtered && (
              <button type="button" onClick={showAll} className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-950 hover:text-white">
                <X size={14} /> Afficher tout
              </button>
            )}
          </div>
        </div>
        <QueryBoundary loading={salons.loading && !salons.data} error={salons.error} onRetry={salons.refetch}>
          {list.length === 0 ? (
            <div className="text-center">
              <EmptyState title="Aucun salon trouvé" description="Essayez une autre prestation ou une autre ville." />
              {filtered && (
                <button type="button" onClick={showAll} className="mt-4 rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800">
                  Afficher tous les salons
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="stagger grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {pager.pageItems.map((salon) => (
                  <SalonCard key={salon.id} salon={salon} />
                ))}
              </div>
              <Pagination
                page={pager.page}
                totalPages={pager.totalPages}
                total={pager.total}
                pageSize={pager.pageSize}
                label="salons"
                onChange={(p) => {
                  pager.setPage(p);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </QueryBoundary>
      </section>
    </div>
  );
}

export default function ClientDiscoverPage() {
  return (
    <Suspense>
      <Discover />
    </Suspense>
  );
}
