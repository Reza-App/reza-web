'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Star, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/modal';
import { Badge, Card, PageHeader } from '@/components/ui/page';
import { EmptyState, QueryBoundary } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { tenantService } from '@/lib/api/services/tenant.service';
import { errorMessage } from '@/lib/api/errors';

const MAX_PHOTOS = 12;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

export default function PhotosPage() {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const query = useApiQuery('salon-photos', async (signal) => {
    const [tenant, settings] = await Promise.all([tenantService.get(signal), tenantService.settings(signal)]);
    return { cover: tenant.coverImage ?? null, photos: Array.isArray(settings.photos) ? settings.photos : [] };
  });
  const photos = query.data?.photos ?? [];
  const cover = query.data?.cover ?? null;

  const savePhotos = async (next: string[]) => {
    await tenantService.updateSettings({ photos: next });
    query.setData((d) => d && { ...d, photos: next });
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    const invalid = list.find((f) => !ACCEPTED.includes(f.type) || f.size > MAX_BYTES);
    if (invalid) {
      toast.error(`${invalid.name} : formats JPG, PNG ou WebP de 5 Mo maximum.`);
      return;
    }
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of list) urls.push(await tenantService.uploadImage(file));
      await savePhotos([...photos, ...urls]);
      if (!cover && urls[0]) {
        await tenantService.update({ coverImage: urls[0] });
        query.setData((d) => d && { ...d, cover: urls[0] });
      }
      toast.success(urls.length > 1 ? `${urls.length} photos ajoutées.` : 'Photo ajoutée.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const makeCover = async (url: string) => {
    try {
      await tenantService.update({ coverImage: url });
      query.setData((d) => d && { ...d, cover: url });
      toast.success('Photo de couverture mise à jour.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await savePhotos(photos.filter((p) => p !== removing));
      toast.success('Photo retirée.');
      setRemoving(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Photos"
        description={`Galerie affichée sur votre page Selia (${photos.length} sur ${MAX_PHOTOS}). La photo de couverture apparaît en premier.`}
        actions={
          <>
            <input ref={input} type="file" accept={ACCEPTED.join(',')} multiple hidden onChange={(e) => upload(e.target.files)} />
            <PrimaryButton onClick={() => input.current?.click()} busy={busy} disabled={photos.length >= MAX_PHOTOS}>
              <ImagePlus size={16} /> Ajouter des photos
            </PrimaryButton>
          </>
        }
      />
      <QueryBoundary loading={query.loading && !query.data} error={query.error} onRetry={query.refetch}>
        {photos.length === 0 ? (
          <EmptyState title="Aucune photo" description="Ajoutez des photos de votre salon pour donner envie à vos clients." />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {photos.map((url) => (
              <Card key={url} className="overflow-hidden p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
                <div className="flex items-center justify-between gap-2 p-3">
                  {url === cover ? (
                    <Badge tone="solid">Couverture</Badge>
                  ) : (
                    <button type="button" onClick={() => makeCover(url)} className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-950">
                      <Star size={14} /> Mettre en couverture
                    </button>
                  )}
                  <button type="button" onClick={() => setRemoving(url)} className="rounded-full p-2 text-neutral-500 hover:bg-red-50 hover:text-red-700" aria-label="Retirer la photo">
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
      <ConfirmDialog
        open={!!removing}
        title="Retirer cette photo ?"
        description="Elle ne sera plus visible sur votre page."
        confirmLabel="Retirer"
        destructive
        busy={busy}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
