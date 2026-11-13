'use client';

import { Card, PageHeader } from '@/components/ui/page';
import { SaveActions, ToggleRow } from '@/components/ui/settings';
import { QueryBoundary } from '@/components/ui/states';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { preferencesService } from '@/lib/api/services/preferences.service';

export default function WaitingListPage() {
  const form = useSettingsForm('preferences', (s) => preferencesService.get(s), preferencesService.save);
  const waitingList = form.draft?.waitingList;

  return (
    <div>
      <PageHeader
        title="Liste d'attente"
        description="Quand un créneau est complet, vos clients peuvent s'inscrire pour être prévenus si une place se libère."
        actions={<SaveActions dirty={form.dirty} saving={form.saving} onSave={form.submit} onReset={form.reset} />}
      />
      <QueryBoundary loading={!waitingList} error={form.query.error} onRetry={form.query.refetch}>
        {waitingList && (
          <Card>
            <ToggleRow
              title="Activer la liste d'attente"
              description="Proposée sur votre page de réservation lorsque aucun créneau n'est disponible."
              checked={waitingList.enabled}
              onChange={(enabled) => form.setDraft((d) => d && { ...d, waitingList: { enabled } })}
            />
          </Card>
        )}
      </QueryBoundary>
    </div>
  );
}
