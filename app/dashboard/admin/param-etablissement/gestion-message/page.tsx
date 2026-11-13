'use client';

import { FormField, fieldClass } from '@/components/ui/modal';
import { Card, PageHeader } from '@/components/ui/page';
import { SaveActions, ToggleRow } from '@/components/ui/settings';
import { QueryBoundary } from '@/components/ui/states';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { preferencesService } from '@/lib/api/services/preferences.service';

const MAX = 1000;

export default function BookingMessagePage() {
  const form = useSettingsForm('preferences', (s) => preferencesService.get(s), preferencesService.save);
  const message = form.draft?.bookingMessage;

  return (
    <div>
      <PageHeader
        title="Message de réservation"
        description="Message affiché à vos clients qui réservent en ligne, juste après le choix de l'horaire."
        actions={<SaveActions dirty={form.dirty} saving={form.saving} onSave={form.submit} onReset={form.reset} />}
      />
      <QueryBoundary loading={!message} error={form.query.error} onRetry={form.query.refetch}>
        {message && (
          <Card>
            <ToggleRow
              title="Afficher le message"
              description="Visible sur votre page de réservation Selia."
              checked={message.enabled}
              onChange={(enabled) => form.setDraft((d) => d && { ...d, bookingMessage: { ...d.bookingMessage, enabled } })}
            />
            <FormField label="Message" hint={`${message.text.length} / ${MAX} caractères`}>
              <textarea
                className={fieldClass}
                rows={6}
                maxLength={MAX}
                value={message.text}
                placeholder="Exemple : merci d'arriver 10 minutes avant votre rendez vous."
                onChange={(e) => form.setDraft((d) => d && { ...d, bookingMessage: { ...d.bookingMessage, text: e.target.value } })}
              />
            </FormField>
          </Card>
        )}
      </QueryBoundary>
    </div>
  );
}
