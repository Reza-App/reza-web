'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { fieldClass, SecondaryButton } from '@/components/ui/modal';
import { Card, PageHeader } from '@/components/ui/page';
import { SaveActions, ToggleRow } from '@/components/ui/settings';
import { QueryBoundary } from '@/components/ui/states';
import { useSettingsForm } from '@/hooks/useSettingsForm';
import { tenantService } from '@/lib/api/services/tenant.service';
import { isValidEmail, messages } from '@/lib/validation';

/** The backend caps the recipients at five addresses. */
const MAX_EMAILS = 5;

interface NotificationSettings {
  emails: string[];
  autoConfirm: boolean;
}

export default function OnlineBookingNotificationsPage() {
  const form = useSettingsForm<NotificationSettings>(
    'booking-notifications',
    async (signal) => {
      const [emails, autoConfirm] = await Promise.all([tenantService.notificationEmails(signal), tenantService.autoConfirm(signal)]);
      return { emails, autoConfirm };
    },
    (draft) => Promise.all([tenantService.updateNotificationEmails(draft.emails), tenantService.setAutoConfirm(draft.autoConfirm)]),
  );
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const draft = form.draft;

  const add = () => {
    const value = email.trim().toLowerCase();
    if (!isValidEmail(value)) return setError(messages.email);
    if (draft?.emails.includes(value)) return setError('Cette adresse est déjà dans la liste.');
    form.setDraft((d) => d && { ...d, emails: [...d.emails, value] });
    setEmail('');
    setError(null);
  };

  return (
    <div>
      <PageHeader
        title="Notifications des réservations en ligne"
        description="Qui est prévenu quand un client réserve, et comment les réservations sont validées."
        actions={<SaveActions dirty={form.dirty} saving={form.saving} onSave={form.submit} onReset={form.reset} />}
      />
      <QueryBoundary loading={!draft} error={form.query.error} onRetry={form.query.refetch}>
        {draft && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Validation">
              <ToggleRow
                title="Confirmer automatiquement"
                description="Les réservations en ligne sont confirmées sans action de votre part. Sinon elles restent en attente dans l'agenda."
                checked={draft.autoConfirm}
                onChange={(autoConfirm) => form.setDraft((d) => d && { ...d, autoConfirm })}
              />
            </Card>
            <Card title="Emails à prévenir">
              <p className="mb-4 text-sm text-neutral-500">
                Jusqu&apos;à {MAX_EMAILS} adresses reçoivent un email à chaque nouvelle réservation ou annulation.
              </p>
              <ul className="mb-4 space-y-2">
                {draft.emails.map((e) => (
                  <li key={e} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-2.5 text-sm">
                    {e}
                    <button
                      type="button"
                      onClick={() => form.setDraft((d) => d && { ...d, emails: d.emails.filter((x) => x !== e) })}
                      className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950"
                      aria-label={`Retirer ${e}`}
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
                {draft.emails.length === 0 && <li className="text-sm text-neutral-400">Aucune adresse.</li>}
              </ul>
              {draft.emails.length < MAX_EMAILS && (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    add();
                  }}
                >
                  <input className={fieldClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="accueil@salon.ma" aria-label="Nouvelle adresse" />
                  <SecondaryButton type="submit">
                    <Plus size={15} /> Ajouter
                  </SecondaryButton>
                </form>
              )}
              {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
            </Card>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
