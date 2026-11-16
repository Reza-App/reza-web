'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormField, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/ui/modal';
import { Badge, Card, PageHeader } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import {
  type ModerationAction,
  type ModerationRule,
  type ModerationRuleType,
  preferencesService,
  type TenantPreferences,
} from '@/lib/api/services/preferences.service';
import { errorMessage } from '@/lib/api/errors';
import { Select } from '@/components/ui/select';
import { IconAction } from '@/components/ui/actions';
import { useUrlAction } from '@/hooks/useUrlAction';

const TYPE_LABELS: Record<ModerationRuleType, string> = {
  keyword: 'Mots interdits',
  rating: 'Note faible',
  length: 'Commentaire trop court',
  'auto-approve': 'Excellent avis',
};

const ACTION_LABELS: Record<ModerationAction, string> = {
  'auto-reject': 'Refuser automatiquement',
  flag: 'Garder pour vérification',
  'auto-approve': 'Publier automatiquement',
};

const DEFAULT_ACTION: Record<ModerationRuleType, ModerationAction> = {
  keyword: 'auto-reject',
  rating: 'flag',
  length: 'auto-reject',
  'auto-approve': 'auto-approve',
};

function describe(rule: ModerationRule): string {
  switch (rule.type) {
    case 'keyword':
      return `Contient : ${rule.keywords.join(', ') || 'aucun mot'}`;
    case 'rating':
      return `Note inférieure à ${rule.rating ?? 3} étoiles`;
    case 'length':
      return `Moins de ${rule.length ?? 10} caractères`;
    case 'auto-approve':
      return `${rule.rating ?? 5} étoiles ou plus et au moins ${rule.length ?? 0} caractères`;
  }
}

function newRule(): ModerationRule {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
    name: '',
    description: '',
    type: 'keyword',
    keywords: [],
    action: 'auto-reject',
    isActive: true,
  };
}

function RuleDialog({ rule, onClose, onSave }: { rule: ModerationRule; onClose: () => void; onSave: (rule: ModerationRule) => Promise<void> }) {
  const [draft, setDraft] = useState(rule);
  const [keywords, setKeywords] = useState(rule.keywords.join(', '));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const setType = (type: ModerationRuleType) =>
    setDraft((d) => ({
      ...d,
      type,
      action: DEFAULT_ACTION[type],
      rating: type === 'rating' ? 3 : type === 'auto-approve' ? 5 : undefined,
      length: type === 'length' ? 10 : type === 'auto-approve' ? 50 : undefined,
    }));

  const submit = async () => {
    const words = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    if (!draft.name.trim()) return setError('Donnez un nom à la règle.');
    if (draft.type === 'keyword' && words.length === 0) return setError('Ajoutez au moins un mot.');
    setBusy(true);
    try {
      await onSave({ ...draft, name: draft.name.trim(), keywords: draft.type === 'keyword' ? words : [] });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={rule.name ? 'Modifier la règle' : 'Nouvelle règle'}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton onClick={submit} busy={busy}>
            Enregistrer
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <FormField label="Nom">
          <input className={fieldClass} maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </FormField>
        <FormField label="Type de règle">
          <Select value={draft.type} onValueChange={(v) => setType(v as ModerationRuleType)}>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </FormField>
        {draft.type === 'keyword' && (
          <FormField label="Mots interdits" hint="Séparés par des virgules. Majuscules et accents ignorés.">
            <input className={fieldClass} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="arnaque, honteux" />
          </FormField>
        )}
        {(draft.type === 'rating' || draft.type === 'auto-approve') && (
          <FormField label={draft.type === 'rating' ? 'Note inférieure à' : 'Note minimale'}>
            <Select value={draft.rating} onValueChange={(v) => setDraft({ ...draft, rating: Number(v) })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} étoile{n > 1 ? 's' : ''}
                </option>
              ))}
            </Select>
          </FormField>
        )}
        {(draft.type === 'length' || draft.type === 'auto-approve') && (
          <FormField label={draft.type === 'length' ? 'Moins de (caractères)' : 'Au moins (caractères)'}>
            <input
              className={fieldClass}
              type="number"
              min={0}
              max={2000}
              value={draft.length ?? 0}
              onChange={(e) => setDraft({ ...draft, length: Math.max(0, Math.min(2000, Number(e.target.value) || 0)) })}
            />
          </FormField>
        )}
        <FormField label="Action">
          <Select value={draft.action} onValueChange={(v) => setDraft({ ...draft, action: v as ModerationAction })}>
            {Object.entries(ACTION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Description (facultatif)">
          <textarea className={fieldClass} rows={2} maxLength={300} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </FormField>
      </div>
    </Modal>
  );
}

export default function ModerationRulesPage() {
  const toast = useToast();
  const query = useApiQuery('preferences', (signal) => preferencesService.get(signal));
  const [editing, setEditing] = useState<ModerationRule | null>(null);
  const [deleting, setDeleting] = useState<ModerationRule | null>(null);
  const [busy, setBusy] = useState(false);
  useUrlAction({ new: () => setEditing(newRule()) });
  const rules = query.data?.moderationRules ?? [];

  const persist = async (next: ModerationRule[], message: string) => {
    const saved = await preferencesService.save({ ...(query.data as TenantPreferences), moderationRules: next });
    query.setData(saved);
    toast.success(message);
  };

  const upsert = (rule: ModerationRule) =>
    persist(rules.some((r) => r.id === rule.id) ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule], 'Règle enregistrée.');

  const toggle = async (rule: ModerationRule) => {
    try {
      await persist(rules.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)), rule.isActive ? 'Règle désactivée.' : 'Règle activée.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await persist(rules.filter((r) => r.id !== deleting.id), 'Règle supprimée.');
      setDeleting(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Règles de modération"
        description="Appliquées automatiquement à chaque nouvel avis. Un refus l'emporte toujours, puis une vérification manuelle, puis une publication automatique."
        actions={
          <PrimaryButton onClick={() => setEditing(newRule())} disabled={!query.data}>
            <Plus size={16} /> Nouvelle règle
          </PrimaryButton>
        }
      />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {rules.length === 0 ? (
          <EmptyState title="Aucune règle" description="Sans règle, chaque avis attend votre validation dans « Avis à modérer »." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-950">{rule.name}</p>
                    <p className="mt-1 text-sm text-neutral-600">{describe(rule)}</p>
                    {rule.description && <p className="mt-1 text-xs text-neutral-400">{rule.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="muted">{TYPE_LABELS[rule.type]}</Badge>
                      <Badge tone={rule.action === 'auto-reject' ? 'danger' : 'neutral'}>{ACTION_LABELS[rule.action]}</Badge>
                    </div>
                  </div>
                  <Switch checked={rule.isActive} onChange={() => toggle(rule)} label={`Activer ${rule.name}`} />
                </div>
                <div className="mt-4 flex justify-end gap-1.5 border-t border-neutral-100 pt-3">
                  <IconAction kind="edit" label={`Modifier ${rule.name}`} onClick={() => setEditing(rule)} />
                  <IconAction kind="delete" label={`Supprimer ${rule.name}`} onClick={() => setDeleting(rule)} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
      {editing && <RuleDialog rule={editing} onClose={() => setEditing(null)} onSave={upsert} />}
      <ConfirmDialog
        open={!!deleting}
        title="Supprimer cette règle ?"
        confirmLabel="Supprimer"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
