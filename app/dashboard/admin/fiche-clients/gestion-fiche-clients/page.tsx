'use client';

import { Card, PageHeader } from '@/components/ui/page';
import { SaveActions, ToggleRow } from '@/components/ui/settings';
import { QueryBoundary } from '@/components/ui/states';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { preferencesService, type TenantPreferences } from '@/lib/api/services/preferences.service';

type FieldKey = keyof TenantPreferences['clientFile'];

const FIELDS: { key: FieldKey; title: string; option?: { key: 'yearOnly' | 'postalCodeOnly'; title: string } }[] = [
  { key: 'gender', title: 'Genre' },
  { key: 'birthDate', title: 'Date de naissance', option: { key: 'yearOnly', title: "Demander seulement l'année" } },
  { key: 'address', title: 'Adresse postale', option: { key: 'postalCodeOnly', title: 'Demander seulement le code postal' } },
];

export default function ClientFileSettingsPage() {
  const form = useSettingsForm('preferences', (s) => preferencesService.get(s), preferencesService.save);
  const fields = form.draft?.clientFile;

  const update = (key: FieldKey, patch: Record<string, boolean>) =>
    form.setDraft((d) => d && { ...d, clientFile: { ...d.clientFile, [key]: { ...d.clientFile[key], ...patch } } });

  return (
    <div>
      <PageHeader
        title="Fiche client"
        description="Choisissez les informations demandées dans la fiche de vos clients. Le prénom, le nom et le téléphone sont toujours demandés."
        actions={<SaveActions dirty={form.dirty} saving={form.saving} onSave={form.submit} onReset={form.reset} />}
      />
      <QueryBoundary loading={!fields} error={form.query.error} onRetry={form.query.refetch}>
        {fields && (
          <div className="grid gap-5 xl:grid-cols-3">
            {FIELDS.map(({ key, title, option }) => {
              const rule = fields[key] as { display: boolean; required: boolean } & Record<string, boolean>;
              return (
                <Card key={key} title={title}>
                  <div className="divide-y divide-neutral-100">
                    <ToggleRow
                      title="Afficher"
                      checked={rule.display}
                      onChange={(display) => update(key, display ? { display } : { display, required: false })}
                    />
                    <ToggleRow
                      title="Obligatoire"
                      checked={rule.required}
                      onChange={(required) => update(key, required ? { required, display: true } : { required })}
                    />
                    {option && <ToggleRow title={option.title} checked={rule[option.key]} onChange={(v) => update(key, { [option.key]: v })} />}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
