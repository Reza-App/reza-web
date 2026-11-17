'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { InvoiceDocument } from '@/components/billing/InvoiceDocument';
import { QueryBoundary } from '@/components/ui/states';
import { useApiQuery } from '@/hooks/useApiQuery';
import { platformService } from '@/lib/api/services/platform.service';

export default function PlatformInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useApiQuery(`platform-invoice:${id}`, (signal) => platformService.invoice(id, signal));
  return (
    <div>
      <Link href="/plateforme/factures" className="no-print mb-5 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-950">
        <ArrowLeft size={16} /> Factures Selia
      </Link>
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {query.data && <InvoiceDocument data={query.data} />}
      </QueryBoundary>
    </div>
  );
}
