'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField, PrimaryButton, fieldClass } from '@/components/ui/modal';
import { Card, PageHeader } from '@/components/ui/page';
import { Select } from '@/components/ui/select';
import { QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { errorMessage } from '@/lib/api/errors';
import { platformService } from '@/lib/api/services/platform.service';
import { formatDateTime } from '@/lib/format';

const AUDIENCES = {
  all: 'Tous les établissements',
  visible: 'Établissements visibles (abonnement en cours)',
} as const;

export default function PlatformMessagesPage() {
  const toast = useToast();
  const history = useApiQuery('platform-broadcasts', (signal) => platformService.broadcasts(signal));
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<'all' | 'visible'>('all');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const check = () => {
    if (title.trim().length < 3) return setError('Donnez un titre au message.');
    if (message.trim().length < 5) return setError('Écrivez le message.');
    setError(null);
    setConfirming(true);
  };

  const send = async () => {
    setBusy(true);
    try {
      const r = await platformService.sendBroadcast({ title: title.trim(), message: message.trim(), audience });
      toast.success(`Message envoyé à ${r.sent} établissement${r.sent > 1 ? 's' : ''}.`);
      setTitle('');
      setMessage('');
      setConfirming(false);
      await history.refetch();
    } catch (e) {
      setError(errorMessage(e));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Messages aux établissements" description="Nouveauté, maintenance, rappel : le message arrive dans la cloche de toute l'équipe de chaque salon." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Nouveau message">
          <div className="space-y-4">
            <FormField label="Destinataires">
              <Select value={audience} onValueChange={(v) => setAudience(v as 'all' | 'visible')} aria-label="Destinataires">
                {Object.entries(AUDIENCES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Titre">
              <input className={fieldClass} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maintenance prévue dimanche" />
            </FormField>
            <FormField label="Message" hint={`${message.length} / 1000`}>
              <textarea className={`${fieldClass} min-h-36`} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </FormField>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
            <div className="flex justify-end">
              <PrimaryButton onClick={check}>
                <Send size={16} /> Envoyer
              </PrimaryButton>
            </div>
          </div>
        </Card>
        <Card title="Messages envoyés">
          <QueryBoundary loading={history.loading && !history.data} error={history.error} onRetry={history.refetch}>
            {(history.data ?? []).length === 0 ? (
              <p className="text-sm text-neutral-500">Aucun message envoyé.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {history.data!.map((m) => (
                  <li key={m.id} className="py-3">
                    <p className="font-medium text-neutral-950">{m.title}</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{m.message}</p>
                    <p className="mt-1.5 text-xs text-neutral-500">
                      {formatDateTime(m.createdAt)}, {m.sent} établissement{m.sent > 1 ? 's' : ''}
                      {m.author ? `, par ${m.author}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </Card>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Envoyer ce message ?"
        description={`« ${title.trim()} » sera envoyé à : ${AUDIENCES[audience].toLowerCase()}. Il ne peut pas être retiré.`}
        confirmLabel="Envoyer"
        busy={busy}
        onConfirm={() => void send()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
