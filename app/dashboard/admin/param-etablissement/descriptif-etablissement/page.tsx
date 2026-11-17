'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FormField, fieldClass, SecondaryButton } from '@/components/ui/modal';
import { Card, PageHeader } from '@/components/ui/page';
import { SaveActions, ToggleRow } from '@/components/ui/settings';
import { QueryBoundary } from '@/components/ui/states';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { tenantService } from '@/lib/api/services/tenant.service';
import { isValidEmail, isValidPhone, normalizePhone } from '@/lib/validation';

interface Profile {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  category: string;
  shortDescription: string;
  website: string;
  googleMapsLink: string;
  description: string;
  amenities: string[];
  instagram: string;
  facebook: string;
  tiktok: string;
  showMap: boolean;
  showOpeningHours: boolean;
  showReviews: boolean;
}

const text = (v: unknown) => (typeof v === 'string' ? v : '');

/** Older salons may still hold internal signup JSON here: never show it. */
function readableDescription(v: unknown): string {
  const value = text(v);
  if (!value.trim().startsWith('{')) return value;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' && 'onboardingCompleted' in parsed ? '' : value;
  } catch {
    return value;
  }
}

function isUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

async function load(signal: AbortSignal): Promise<Profile> {
  const [tenant, settings] = await Promise.all([tenantService.get(signal), tenantService.settings(signal)]);
  const social = (settings.socialMedia ?? {}) as Record<string, string>;
  return {
    name: tenant.name,
    email: text(tenant.email),
    phone: text(tenant.phone),
    address: text(tenant.address),
    city: text(tenant.city),
    category: text(tenant.category),
    shortDescription: text(tenant.shortDescription),
    website: text(tenant.website),
    googleMapsLink: text(tenant.googleMapsLink),
    description: readableDescription(settings.description),
    amenities: Array.isArray(settings.amenities) ? settings.amenities : [],
    instagram: text(social.instagram),
    facebook: text(social.facebook),
    tiktok: text(social.tiktok),
    showMap: settings.showMap ?? true,
    showOpeningHours: settings.showOpeningHours ?? true,
    showReviews: settings.showReviews ?? true,
  };
}

async function save(p: Profile) {
  if (!p.name.trim()) throw new Error('Le nom du salon est requis.');
  if (p.email && !isValidEmail(p.email)) throw new Error("L'email du salon est invalide.");
  if (p.phone && !isValidPhone(p.phone)) throw new Error('Le téléphone du salon est invalide.');
  for (const [label, url] of [['Site web', p.website], ['Lien Google Maps', p.googleMapsLink], ['Instagram', p.instagram], ['Facebook', p.facebook], ['TikTok', p.tiktok]]) {
    if (url && !isUrl(url)) throw new Error(`${label} : adresse invalide (https://...).`);
  }
  await Promise.all([
    tenantService.update({
      name: p.name.trim(),
      email: p.email.trim() || undefined,
      phone: p.phone ? normalizePhone(p.phone) : undefined,
      address: p.address.trim(),
      city: p.city.trim(),
      category: p.category.trim(),
      shortDescription: p.shortDescription.trim(),
      website: p.website.trim(),
      ...(p.googleMapsLink ? { googleMapsLink: p.googleMapsLink.trim() } : {}),
    }),
    tenantService.updateSettings({
      description: p.description.trim(),
      amenities: p.amenities,
      socialMedia: { instagram: p.instagram.trim(), facebook: p.facebook.trim(), tiktok: p.tiktok.trim() },
      showMap: p.showMap,
      showOpeningHours: p.showOpeningHours,
      showReviews: p.showReviews,
    }),
  ]);
}

/**
 * Salon types: the filters of the client app plus "Institut de beauté". A
 * salon in one of them shows up in that filter; "Autre" lets the salon write
 * its own.
 */
const SALON_TYPES = ['Coiffeur', 'Barbier', 'Institut de beauté', 'Esthétique', 'Manucure', 'Pédicure', 'Épilation', 'Maquillage', 'Massage', 'Spa', 'Hammam', 'Soin', 'Couleur'];
const MAX_CATEGORIES = 6;

/** Stored as one text, "Coiffeur, Barbier": the client filters match each part. */
const splitCategories = (value: string) =>
  value
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

function CategoryField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const list = splitCategories(value);
  const [draft, setDraft] = useState('');
  const has = (c: string) => list.some((x) => x.toLowerCase() === c.toLowerCase());
  const full = list.length >= MAX_CATEGORIES;
  const set = (next: string[]) => onChange(next.join(', '));
  const toggle = (c: string) => (has(c) ? set(list.filter((x) => x.toLowerCase() !== c.toLowerCase())) : !full && set([...list, c]));
  const custom = list.filter((c) => !SALON_TYPES.some((t) => t.toLowerCase() === c.toLowerCase()));
  const addOther = () => {
    const c = draft.replace(/,/g, ' ').trim();
    if (!c || has(c) || full) return;
    set([...list, c]);
    setDraft('');
  };
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition ${active ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700 hover:border-neutral-400'}`;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Catégories">
        {SALON_TYPES.map((t) => (
          <button key={t} type="button" aria-pressed={has(t)} disabled={!has(t) && full} onClick={() => toggle(t)} className={`${chip(has(t))} disabled:opacity-40`}>
            {t}
          </button>
        ))}
        {custom.map((c) => (
          <button key={c} type="button" aria-pressed onClick={() => toggle(c)} className={`${chip(true)} flex items-center gap-1`} aria-label={`Retirer ${c}`}>
            {c}
            <X size={13} />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={fieldClass}
          maxLength={40}
          placeholder="Autre catégorie"
          aria-label="Autre catégorie"
          value={draft}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOther();
            }
          }}
        />
        <SecondaryButton type="button" onClick={addOther} disabled={full || !draft.trim()} aria-label="Ajouter la catégorie">
          <Plus size={15} />
        </SecondaryButton>
      </div>
      <p className="text-xs text-neutral-500">
        {list.length ? `${list.length} sélectionnée${list.length > 1 ? 's' : ''}` : 'Aucune catégorie'}, {MAX_CATEGORIES} au maximum. Votre salon apparaît dans chaque filtre choisi.
      </p>
    </div>
  );
}

export default function SalonProfilePage() {
  const form = useSettingsForm('salon-profile', load, save, 'Descriptif enregistré.');
  const [amenity, setAmenity] = useState('');
  const p = form.draft;
  const bind = (key: keyof Profile) => ({
    value: p ? (p[key] as string) : '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => form.setDraft((d) => d && { ...d, [key]: e.target.value }),
  });

  return (
    <div>
      <PageHeader
        title="Descriptif de l'établissement"
        description="Informations présentées sur votre page Selia."
        actions={<SaveActions dirty={form.dirty} saving={form.saving} onSave={form.submit} onReset={form.reset} />}
      />
      <QueryBoundary loading={!p} error={form.query.error} onRetry={form.query.refetch}>
        {p && (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="space-y-6">
              <Card title="Identité">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Nom du salon" className="sm:col-span-2">
                    <input className={fieldClass} maxLength={100} {...bind('name')} />
                  </FormField>
                  <FormField label="Catégories" className="sm:col-span-2" group>
                    <CategoryField value={p.category} onChange={(category) => form.setDraft((d) => d && { ...d, category })} />
                  </FormField>
                  <FormField label="Ville">
                    <input className={fieldClass} maxLength={60} {...bind('city')} />
                  </FormField>
                  <FormField label="Adresse" className="sm:col-span-2">
                    <input className={fieldClass} maxLength={200} {...bind('address')} />
                  </FormField>
                  <FormField label="Téléphone">
                    <input className={fieldClass} type="tel" {...bind('phone')} />
                  </FormField>
                  <FormField label="Email">
                    <input className={fieldClass} type="email" {...bind('email')} />
                  </FormField>
                  <FormField label="Site web" className="sm:col-span-2">
                    <input className={fieldClass} type="url" placeholder="https://" {...bind('website')} />
                  </FormField>
                  <FormField label="Lien Google Maps" className="sm:col-span-2" hint="La position sur la carte est calculée depuis ce lien.">
                    <input className={fieldClass} type="url" placeholder="https://maps.google.com/..." {...bind('googleMapsLink')} />
                  </FormField>
                </div>
              </Card>
              <Card title="Présentation">
                <div className="space-y-4">
                  <FormField label="Accroche" hint="Une phrase affichée sous le nom du salon.">
                    <input className={fieldClass} maxLength={160} {...bind('shortDescription')} />
                  </FormField>
                  <FormField label="À propos">
                    <textarea className={fieldClass} rows={7} maxLength={3000} {...bind('description')} />
                  </FormField>
                </div>
              </Card>
            </div>
            <div className="space-y-6">
              <Card title="Équipements et services">
                <div className="mb-3 flex flex-wrap gap-2">
                  {p.amenities.map((a) => (
                    <span key={a} className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1 text-sm">
                      {a}
                      <button type="button" onClick={() => form.setDraft((d) => d && { ...d, amenities: d.amenities.filter((x) => x !== a) })} aria-label={`Retirer ${a}`}>
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = amenity.trim();
                    if (!value || p.amenities.includes(value) || p.amenities.length >= 20) return;
                    form.setDraft((d) => d && { ...d, amenities: [...d.amenities, value] });
                    setAmenity('');
                  }}
                >
                  <input className={fieldClass} maxLength={40} value={amenity} onChange={(e) => setAmenity(e.target.value)} placeholder="Wifi, Climatisation..." aria-label="Nouvel équipement" />
                  <SecondaryButton type="submit">
                    <Plus size={15} />
                  </SecondaryButton>
                </form>
              </Card>
              <Card title="Réseaux sociaux">
                <div className="space-y-3">
                  <FormField label="Instagram">
                    <input className={fieldClass} type="url" placeholder="https://instagram.com/..." {...bind('instagram')} />
                  </FormField>
                  <FormField label="Facebook">
                    <input className={fieldClass} type="url" placeholder="https://facebook.com/..." {...bind('facebook')} />
                  </FormField>
                  <FormField label="TikTok">
                    <input className={fieldClass} type="url" placeholder="https://tiktok.com/@..." {...bind('tiktok')} />
                  </FormField>
                </div>
              </Card>
              <Card title="Affichage sur votre page">
                <div className="divide-y divide-neutral-100">
                  <ToggleRow title="Carte" checked={p.showMap} onChange={(showMap) => form.setDraft((d) => d && { ...d, showMap })} />
                  <ToggleRow title="Horaires" checked={p.showOpeningHours} onChange={(showOpeningHours) => form.setDraft((d) => d && { ...d, showOpeningHours })} />
                  <ToggleRow title="Avis clients" checked={p.showReviews} onChange={(showReviews) => form.setDraft((d) => d && { ...d, showReviews })} />
                </div>
              </Card>
            </div>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
