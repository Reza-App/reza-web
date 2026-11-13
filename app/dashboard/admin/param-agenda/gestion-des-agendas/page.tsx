'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { EmployeeFormDialog } from '@/components/admin/EmployeeFormDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/modal';
import { Avatar, Badge, Card, PageHeader } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { referenceKeys, useEmployees, useServices } from '@/hooks/useReferenceData';
import { useAuth } from '@/contexts/AuthContext';
import { invalidate } from '@/lib/api/memo';
import { employeeService } from '@/lib/api/services/catalog.service';
import { errorMessage } from '@/lib/api/errors';
import { personName } from '@/lib/format';
import type { Employee } from '@/lib/types/catalog';
import { IconAction } from '@/components/ui/actions';
import { useUrlAction } from '@/hooks/useUrlAction';

function workingDays(e: Employee) {
  const days = (e.workingHours ?? []).filter((d) => d.isWorking).map((d) => d.day.slice(0, 3));
  return days.length ? days.join(', ') : 'Horaires non définis';
}

export default function AgendasPage() {
  const toast = useToast();
  const { activeSalon } = useAuth();
  const employees = useEmployees();
  const { data: catalog } = useServices();
  const [editing, setEditing] = useState<Employee | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [busy, setBusy] = useState(false);
  useUrlAction({ new: () => setEditing('new') });

  const refresh = () => {
    if (activeSalon) {
      invalidate(referenceKeys.employees(activeSalon.id));
      invalidate(referenceKeys.services(activeSalon.id));
    }
    void employees.refetch();
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await employeeService.remove(deleting.id);
      toast.success('Collaborateur supprimé.');
      setDeleting(null);
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const list = employees.data ?? [];

  return (
    <div>
      <PageHeader
        title="Agendas"
        description="Un agenda par collaborateur : horaires de travail, couleur, réservation en ligne et prestations réalisées."
        actions={
          <PrimaryButton onClick={() => setEditing('new')}>
            <Plus size={16} /> Nouveau collaborateur
          </PrimaryButton>
        }
      />
      <QueryBoundary loading={employees.loading && !employees.data} error={employees.error} onRetry={employees.refetch}>
        {list.length === 0 ? (
          <EmptyState title="Aucun collaborateur" description="Ajoutez les membres de votre équipe pour ouvrir leurs agendas." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {list.map((e) => (
              <Card key={e.id}>
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar name={personName(e)} src={e.avatar} size={48} />
                    <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white" style={{ background: e.agendaSettings?.color ?? '#0a0a0a' }} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-neutral-950">{personName(e)}</p>
                    <p className="text-sm text-neutral-500">{e.agendaSettings?.role || 'Collaborateur'}</p>
                    <p className="mt-2 text-xs text-neutral-400">{workingDays(e)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={e.isActive ? 'green' : 'muted'}>{e.isActive ? 'Actif' : 'Inactif'}</Badge>
                      {e.agendaSettings?.allowOnlineBooking !== false && <Badge>En ligne</Badge>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-1.5 border-t border-neutral-100 pt-3">
                  <IconAction kind="edit" label={`Modifier ${personName(e)}`} onClick={() => setEditing(e)} />
                  <IconAction kind="delete" label={`Supprimer ${personName(e)}`} onClick={() => setDeleting(e)} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
      {editing && (
        <EmployeeFormDialog employee={editing === 'new' ? null : editing} services={catalog?.services ?? []} onClose={() => setEditing(null)} onSaved={refresh} />
      )}
      <ConfirmDialog
        open={!!deleting}
        title={`Supprimer ${personName(deleting)} ?`}
        description="Son agenda sera fermé. Pour seulement suspendre les réservations, passez plutôt le collaborateur en inactif."
        confirmLabel="Supprimer"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
