'use client';

import { use, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Globe, Heart, MapPin, Phone, Star } from 'lucide-react';
import { Lightbox } from '@/components/client/Lightbox';
import { Card } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { clientAccount, discovery } from '@/lib/api/services/clientArea.service';
import { durationLabel, groupServices, openingHours, servicePrice } from '@/lib/clientSalon';
import { formatDate, personName } from '@/lib/format';
import { CLIENT_LOGIN } from '@/lib/session';

function Stars({ value }: { value: number }) {
  return (
    <span className="flex" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'} />
      ))}
    </span>
  );
}

export default function ClientSalonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const { status, client } = useClientAuth();

  const salonQuery = useApiQuery(`client-salon:${id}`, (signal) => discovery.salon(id, signal));
  const salon = salonQuery.data;
  const tenantId = salon?.id;
  const services = useApiQuery(tenantId ? `client-salon-services:${tenantId}` : null, (signal) => discovery.services(tenantId!, signal));
  const team = useApiQuery(tenantId ? `client-salon-team:${tenantId}` : null, (signal) => discovery.employees(tenantId!, signal));
  const reviews = useApiQuery(tenantId ? `client-salon-reviews:${tenantId}` : null, (signal) => discovery.reviews(tenantId!, signal));
  const favorites = useApiQuery(status === 'authenticated' ? 'client-favorites' : null, (signal) => clientAccount.favorites(signal));
  const favorite = favorites.data?.find((f) => f.tenantId === tenantId);
  const [busy, setBusy] = useState(false);

  const bookHref = (serviceId?: string) => `/client/salon/${encodeURIComponent(id)}/reserver${serviceId ? `?prestation=${encodeURIComponent(serviceId)}` : ''}`;
  const goBook = (serviceId?: string) => {
    const href = bookHref(serviceId);
    router.push(status === 'authenticated' ? href : `${CLIENT_LOGIN}?next=${encodeURIComponent(href)}`);
  };

  const toggleFavorite = async () => {
    if (status !== 'authenticated' || !client || !tenantId) {
      router.push(`${CLIENT_LOGIN}?next=${encodeURIComponent(`/client/salon/${id}`)}`);
      return;
    }
    setBusy(true);
    try {
      if (favorite) {
        await clientAccount.removeFavorite(favorite.id);
        toast.success('Retiré de vos favoris.');
      } else {
        await clientAccount.addFavorite(tenantId, client.email);
        toast.success('Ajouté à vos favoris.');
      }
      await favorites.refetch();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const photos = salon ? [salon.coverImage, ...(salon.settings?.photos ?? []), ...(salon.images ?? [])].filter((p, i, all): p is string => !!p && all.indexOf(p) === i) : [];
  const shown = photos.slice(0, 5);
  const [viewing, setViewing] = useState<number | null>(null);
  const hours = openingHours(salon?.settings?.businessHours);
  const groups = groupServices(services.data ?? []);
  const bookable = salon?.onlineReservationEnabled !== false && salon?.settings?.onlineReservationEnabled !== false;

  return (
    <div>
      <Link href="/client" className="mb-5 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-950">
        <ArrowLeft size={16} /> Découvrir
      </Link>
      <QueryBoundary loading={salonQuery.loading && !salon} error={salonQuery.error} onRetry={salonQuery.refetch}>
        {salon && (
          <div className="space-y-8">
            {viewing !== null && <Lightbox photos={photos} index={viewing} onIndexChange={setViewing} onClose={() => setViewing(null)} title={salon.name} />}
            {photos.length > 0 && (
              <div
                className={`grid h-64 gap-2 overflow-hidden rounded-[2rem] sm:h-96 ${
                  shown.length === 1 ? '' : shown.length === 2 ? 'sm:grid-cols-[2fr_1fr]' : shown.length === 3 ? 'sm:grid-cols-[2fr_1fr] sm:grid-rows-2' : 'sm:grid-cols-4 sm:grid-rows-2'
                }`}
              >
                {shown.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setViewing(i)}
                    aria-label={`Agrandir la photo ${i + 1}`}
                    className={`group relative cursor-zoom-in overflow-hidden bg-neutral-100 ${
                      i === 0 ? (shown.length >= 3 ? (shown.length === 3 ? 'sm:row-span-2' : 'sm:col-span-2 sm:row-span-2') : '') : 'hidden sm:block'
                    }`}
                  >
                    <Image src={src} alt="" fill unoptimized className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes="(min-width: 640px) 50vw, 100vw" priority={i === 0} />
                    {i === shown.length - 1 && photos.length > shown.length && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-lg font-medium text-white">+{photos.length - shown.length} photos</span>
                    )}
                    {i === 0 && photos.length > 1 && (
                      <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-medium text-neutral-900 sm:hidden">
                        {photos.length} photos
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                {salon.category && <p className="text-sm text-neutral-500">{salon.category}</p>}
                <h1 className="mt-1 text-3xl font-medium text-neutral-950 sm:text-4xl">{salon.name}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-neutral-600">
                  {salon.rating ? (
                    <span className="flex items-center gap-1.5">
                      <Star size={15} className="fill-amber-400 text-amber-400" />
                      {salon.rating.toFixed(1)} {reviews.data?.stats ? `(${reviews.data.stats.totalReviews} avis)` : ''}
                    </span>
                  ) : null}
                  {(salon.address || salon.city) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={15} /> {[salon.address, salon.city].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {salon.nextAvailable && <span className="text-emerald-700">{salon.nextAvailable}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void toggleFavorite()}
                  disabled={busy}
                  className={`rounded-full border p-3 transition ${favorite ? 'border-red-200 bg-red-50 text-red-600' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}
                  aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  aria-pressed={!!favorite}
                >
                  <Heart size={18} className={favorite ? 'fill-current' : ''} />
                </button>
                {bookable && (
                  <button type="button" onClick={() => goBook()} className="rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800">
                    Réserver
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-8">
                <section>
                  <h2 className="mb-4 text-xl font-medium text-neutral-950">Prestations</h2>
                  <QueryBoundary loading={services.loading && !services.data} error={services.error} onRetry={services.refetch}>
                    {groups.length === 0 ? (
                      <EmptyState title="Aucune prestation en ligne" />
                    ) : (
                      <div className="space-y-6">
                        {groups.map(([category, items]) => (
                          <div key={category}>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-neutral-500">{category}</h3>
                            <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
                              {items.map((s) => (
                                <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-4">
                                  <div className="min-w-0">
                                    <p className="font-medium text-neutral-950">{s.name}</p>
                                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500">
                                      <Clock size={13} /> {durationLabel(s.duration)} · {servicePrice(s)}
                                    </p>
                                  </div>
                                  {bookable && s.visibility !== 'VISIBLE' && (
                                    <button
                                      type="button"
                                      onClick={() => goBook(s.id)}
                                      className="shrink-0 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-950 hover:text-white"
                                    >
                                      Choisir
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </QueryBoundary>
                </section>

                {salon.settings?.showReviews !== false && (
                  <section>
                    <h2 className="mb-4 text-xl font-medium text-neutral-950">Avis {reviews.data?.stats ? `(${reviews.data.stats.totalReviews})` : ''}</h2>
                    {(reviews.data?.reviews ?? []).length === 0 ? (
                      <p className="text-sm text-neutral-500">Pas encore d&apos;avis.</p>
                    ) : (
                      <ul className="space-y-3">
                        {reviews.data!.reviews.slice(0, 10).map((r) => (
                          <li key={r.id} className="rounded-2xl border border-neutral-200 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-neutral-950">{personName(r.client) || 'Client Selia'}</p>
                              <Stars value={r.rating} />
                            </div>
                            {r.comment && <p className="mt-2 text-sm leading-relaxed text-neutral-700">{r.comment}</p>}
                            <p className="mt-2 text-xs text-neutral-400">{formatDate(r.createdAt)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </div>

              <aside className="space-y-6">
                {salon.settings?.description && (
                  <Card title="À propos">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{salon.settings.description}</p>
                  </Card>
                )}
                {salon.settings?.showOpeningHours !== false && hours.length > 0 && (
                  <Card title="Horaires">
                    <ul className="space-y-2 text-sm">
                      {hours.map((h) => (
                        <li key={h.day} className="flex justify-between gap-4">
                          <span className="text-neutral-600">{h.day}</span>
                          <span className={h.label ? 'text-right text-neutral-950' : 'text-neutral-400'}>{h.label ?? 'Fermé'}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                <Card title="Contact">
                  <ul className="space-y-3 text-sm">
                    {salon.phone && (
                      <li>
                        <a href={`tel:${salon.phone}`} className="flex items-center gap-2 text-neutral-800 hover:underline">
                          <Phone size={15} /> {salon.phone}
                        </a>
                      </li>
                    )}
                    {salon.googleMapsLink && /^https:\/\//.test(salon.googleMapsLink) && (
                      <li>
                        <a href={salon.googleMapsLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-800 hover:underline">
                          <MapPin size={15} /> Itinéraire
                        </a>
                      </li>
                    )}
                    {salon.website && /^https?:\/\//.test(salon.website) && (
                      <li>
                        <a href={salon.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-neutral-800 hover:underline">
                          <Globe size={15} /> Site web
                        </a>
                      </li>
                    )}
                  </ul>
                </Card>
                {(team.data ?? []).length > 0 && (
                  <Card title="L'équipe">
                    <ul className="grid grid-cols-2 gap-4">
                      {team.data!.map((e) => (
                        <li key={e.id} className="flex items-center gap-3">
                          {e.avatar ? (
                            <Image src={e.avatar} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold">
                              {e.firstName[0]}
                              {e.lastName?.[0]}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-neutral-950">{e.firstName}</span>
                            {e.role && <span className="block truncate text-xs text-neutral-500">{e.role}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </aside>
            </div>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
