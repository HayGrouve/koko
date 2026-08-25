"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  closeGallery,
  loadMorePhotos,
  removePhoto,
} from "@/app/admin/actions";
import { copy } from "@/lib/admin-copy";
import { LIST_PAGE_SIZE } from "@/lib/uploaded-photos";
import type { GalleryPhoto } from "@/lib/fetch-gallery-page";
import { Display, Narrative } from "@/components/ui/typography";

type Props = {
  initialPhotos: GalleryPhoto[];
  initialHasMore: boolean;
};

export function AdminGallery({ initialPhotos, initialHasMore }: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(LIST_PAGE_SIZE);
  const [pending, startTransition] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<GalleryPhoto | null>(
    null,
  );

  const showEmpty = photos.length === 0 && !hasMore;

  function handleLoadMore() {
    startTransition(async () => {
      const page = await loadMorePhotos(nextOffset);
      setPhotos((current) => [...current, ...page.photos]);
      setHasMore(page.hasMore);
      setNextOffset((offset) => offset + LIST_PAGE_SIZE);
    });
  }

  function handleConfirmRemove() {
    if (!pendingRemoval) {
      return;
    }
    const key = pendingRemoval.key;
    startTransition(async () => {
      const result = await removePhoto(key);
      if (result.ok) {
        setPhotos((current) => current.filter((photo) => photo.key !== key));
        setRemoveError(null);
        setPendingRemoval(null);
        return;
      }
      setRemoveError(result.error);
      setPendingRemoval(null);
    });
  }

  return (
    <div className="w-full space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div className="space-y-4 max-w-2xl">
          <Display className="text-4xl md:text-5xl">{copy.galleryTitle}</Display>
          <Narrative>{copy.gallerySubtitle}</Narrative>
        </div>
        <form action={closeGallery}>
          <button
            type="submit"
            className="font-label text-sm uppercase tracking-widest text-secondary hover:text-primary"
          >
            {copy.logout}
          </button>
        </form>
      </div>

      {showEmpty ? (
        <p className="text-center text-on-surface-variant font-light py-16">
          {copy.empty}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <article
              key={photo.key}
              className="relative aspect-square rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container-low group/item"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.name}
                className="object-cover w-full h-full"
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/55 text-white p-3 space-y-0.5">
                <p className="text-xs truncate">{photo.name}</p>
                <p className="text-[11px] opacity-90">
                  {photo.uploadedAtLabel} · {photo.sizeLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRemoveError(null);
                  setPendingRemoval(photo);
                }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-100 md:opacity-0 md:group-hover/item:opacity-100 transition-opacity hover:bg-black/70"
                aria-label={copy.removeAria}
              >
                <X className="w-4 h-4" />
              </button>
            </article>
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={pending}
            className="!bg-primary !text-on-primary px-10 py-4 rounded-full font-label text-sm uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-70"
          >
            {copy.loadMore}
          </button>
        </div>
      ) : null}

      {removeError ? (
        <p className="text-center text-sm text-error" role="alert">
          {removeError}
        </p>
      ) : null}

      {pendingRemoval ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-photo-title"
        >
          <div className="bg-surface-container-lowest rounded-xl max-w-sm w-full p-6 space-y-6 shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingRemoval.url}
              alt={pendingRemoval.name}
              className="w-full aspect-square object-cover rounded-lg"
            />
            <p id="remove-photo-title" className="text-on-surface text-center">
              {copy.confirmBody}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setPendingRemoval(null)}
                className="flex-1 border border-outline-variant/30 rounded-full py-3 font-label text-sm uppercase tracking-widest text-secondary"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={pending}
                className="flex-1 !bg-primary !text-on-primary rounded-full py-3 font-label text-sm uppercase tracking-widest disabled:opacity-70"
              >
                {copy.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
