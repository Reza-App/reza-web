'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { AppointmentCard } from '@/components/agenda/AppointmentCard';
import { Card, PageHeader } from '@/components/ui/page';
import { SaveActions, ToggleRow } from '@/components/ui/settings';
import { Switch } from '@/components/ui/switch';
import { QueryBoundary } from '@/components/ui/states';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { tenantService } from '@/lib/api/services/tenant.service';
import type { Appointment } from '@/lib/types/appointment';

const PREVIEW: Appointment = {
  id: 'preview',
  tenantId: '',
  clientId: '',
  client: { id: 'c', firstName: 'Nour', lastName: 'Benali' },
  startTime: '2026-01-05T10:00:00',
  endTime: '2026-01-05T11:30:00',
  duration: 90,
  status: 'CONFIRMED',
  notes: 'Première visite',
  services: [{ id: 's', serviceId: 's', name: 'Coupe et brushing', duration: 90, price: 280 }],
};

export default function AppointmentDisplayPage() {
  const form = useSettingsForm('display-settings', (s) => tenantService.displaySettings(s), tenantService.updateDisplaySettings);
  const draft = form.draft;
  const fields = draft ? [...draft.fields].sort((a, b) => a.order - b.order) : [];

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    form.setDraft((d) => d && { ...d, fields: next.map((f, i) => ({ ...f, order: i + 1 })) });
  };

  return (
    <div>
      <PageHeader
        title="Affichage des rendez vous"
        description="Informations visibles sur les cartes de l'agenda, dans l'ordre choisi."
        actions={<SaveActions dirty={form.dirty} saving={form.saving} onSave={form.submit} onReset={form.reset} />}
      />
      <QueryBoundary loading={!draft} error={form.query.error} onRetry={form.query.refetch}>
        {draft && (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card title="Informations affichées">
              <ToggleRow
                title="Couleur du collaborateur"
                description="Teinte chaque carte avec la couleur de l'agenda du collaborateur."
                checked={draft.showColorInRDV}
                onChange={(showColorInRDV) => form.setDraft((d) => d && { ...d, showColorInRDV })}
              />
              <ul className="mt-2 space-y-2">
                {fields.map((field, i) => (
                  <li key={field.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3">
                    <div className="flex flex-col">
                      <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="text-neutral-400 hover:text-neutral-950 disabled:opacity-30" aria-label={`Monter ${field.label}`}>
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={i === fields.length - 1}
                        onClick={() => move(i, 1)}
                        className="text-neutral-400 hover:text-neutral-950 disabled:opacity-30"
                        aria-label={`Descendre ${field.label}`}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <span className="flex-1 text-sm text-neutral-900">{field.label}</span>
                    <Switch
                      checked={field.visible}
                      label={`Afficher ${field.label}`}
                      onChange={(visible) => form.setDraft((d) => d && { ...d, fields: d.fields.map((f) => (f.id === field.id ? { ...f, visible } : f)) })}
                    />
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Aperçu">
              <div className="h-28 w-56">
                <AppointmentCard appointment={PREVIEW} display={draft} color="#6b6b6b" onOpen={() => undefined} style={{ height: '100%' }} />
              </div>
            </Card>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
