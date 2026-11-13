'use client';

import { PrimaryButton, SecondaryButton } from './modal';
import { Switch } from './switch';

/** Save bar shown at the top of every settings page. */
export function SaveActions({ dirty, saving, onSave, onReset }: { dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {dirty && <span className="text-xs text-neutral-500">Modifications non enregistrées</span>}
      <SecondaryButton onClick={onReset} disabled={!dirty || saving}>
        Annuler
      </SecondaryButton>
      <PrimaryButton onClick={onSave} busy={saving} disabled={!dirty}>
        Enregistrer
      </PrimaryButton>
    </div>
  );
}

/** A labelled on/off setting row. */
export function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <p className="text-sm font-medium text-neutral-950">{title}</p>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}
