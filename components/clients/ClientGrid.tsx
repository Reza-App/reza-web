'use client';

import { CalendarDays, Mail, MapPin, Pencil, Phone, Trash2 } from 'lucide-react';
import { CLIENT_STATUS_LABELS } from '@/components/clients/ClientFormDialog';
import { Avatar, Badge } from '@/components/ui/page';
import { formatDate, personName } from '@/lib/format';
import { CLIENT_STATUS_TONES, statusTone } from '@/lib/status';
import type { Client } from '@/lib/types/catalog';

/** Grid view of the client file: one card per client, actions on hover. */
export function ClientGrid({ clients, onEdit, onDelete }: { clients: Client[]; onEdit: (c: Client) => void; onDelete?: (c: Client) => void }) {
  return (
    <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {clients.map((client) => (
        <article key={client.id} className="group rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={personName(client)} src={client.avatar} size={44} />
              <div className="min-w-0 space-y-1">
                <h3 className="truncate font-medium text-neutral-950">{personName(client)}</h3>
                <Badge tone={statusTone(CLIENT_STATUS_TONES, client.status ?? 'ACTIVE')}>{CLIENT_STATUS_LABELS[client.status ?? 'ACTIVE'] ?? client.status}</Badge>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
              <button
                type="button"
                onClick={() => onEdit(client)}
                aria-label={`Modifier ${personName(client)}`}
                title="Modifier"
                className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950"
              >
                <Pencil size={15} />
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(client)}
                  aria-label={`Supprimer ${personName(client)}`}
                  title="Supprimer"
                  className="rounded-full p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-neutral-600">
            {client.phone && (
              <li className="flex items-center gap-2">
                <Phone size={14} className="shrink-0 text-neutral-400" /> {client.phone}
              </li>
            )}
            {client.email && (
              <li className="flex min-w-0 items-center gap-2">
                <Mail size={14} className="shrink-0 text-neutral-400" /> <span className="truncate">{client.email}</span>
              </li>
            )}
            {client.address && (
              <li className="flex min-w-0 items-center gap-2">
                <MapPin size={14} className="shrink-0 text-neutral-400" /> <span className="truncate">{client.address}</span>
              </li>
            )}
          </ul>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={13} /> {client._count?.appointments ?? 0} rendez vous
            </span>
            <span>Depuis le {formatDate(client.createdAt)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
