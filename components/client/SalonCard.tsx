import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import type { SalonCard as Salon } from '@/lib/api/services/clientArea.service';
import { salonLocation } from '@/lib/clientSalon';

/** Salon tile of the discovery grid and favorites. */
export function SalonCard({ salon, action }: { salon: Salon; action?: React.ReactNode }) {
  const cover = salon.coverImage || salon.images?.[0] || null;
  const href = `/client/salon/${encodeURIComponent(salon.slug || salon.id)}`;
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-neutral-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] bg-neutral-100">
          {cover ? (
            <Image src={cover} alt="" fill unoptimized className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes="(min-width: 1024px) 33vw, 100vw" />
          ) : (
            <span className="flex h-full items-center justify-center text-3xl font-medium text-neutral-300">{salon.name.slice(0, 1)}</span>
          )}
          {salon.category && (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-neutral-800">{salon.category}</span>
          )}
        </div>
        <div className="space-y-1.5 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-medium leading-snug text-neutral-950">{salon.name}</h3>
            {salon.rating ? (
              <span className="flex shrink-0 items-center gap-1 text-sm text-neutral-800">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                {salon.rating.toFixed(1)}
                {salon.reviews ? <span className="text-neutral-400">({salon.reviews})</span> : null}
              </span>
            ) : null}
          </div>
          {(salon.city || salon.address) && (
            <p className="flex items-center gap-1.5 text-sm text-neutral-500">
              <MapPin size={14} className="shrink-0" />
              <span className="truncate">{salonLocation(salon.address, salon.city)}</span>
            </p>
          )}
          <div className="flex items-center justify-between pt-1 text-sm">
            <span className="text-neutral-600">{salon.price ?? ''}</span>
            {salon.nextAvailable && (
              <span className={`text-xs ${salon.nextAvailable.startsWith('Ouvert') ? 'text-emerald-700' : salon.nextAvailable.startsWith('En pause') ? 'text-amber-700' : 'text-neutral-500'}`}>
                {salon.nextAvailable}
              </span>
            )}
          </div>
        </div>
      </Link>
      {action && <div className="absolute right-3 top-3">{action}</div>}
    </article>
  );
}
