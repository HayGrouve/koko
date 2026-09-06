"use client";

import { useEffect, useState, useTransition, type MouseEvent } from "react";
import { Trash2, X } from "lucide-react";
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
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [packing, setPacking] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<GalleryPhoto | null>(
    null,
  );
  const [viewingPhoto, setViewingPhoto] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (!viewingPhoto) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setViewingPhoto(null);
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [viewingPhoto]);

  const showEmpty = photos.length === 0 && !hasMore;

  function handleArchiveClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (packing) {
      return;
    }
    setPacking(true);
    setArchiveError(null);
    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    iframe.title = copy.archiveDownload;
    iframe.src = "/admin/archive";
    function finish(failed: boolean) {
      if (failed) {
        setArchiveError(copy.archiveError);
      }
      setPacking(false);
      iframe.remove();
    }
    iframe.onload = () => {
      let failed = false;
      try {
        const text = iframe.contentDocument?.body?.innerText?.trim() ?? "";
        failed = text.length > 0;
      } catch {
        failed = false;
      }
      finish(failed);
    };
    iframe.onerror = () => {
      finish(true);
    };
    document.body.appendChild(iframe);
  }

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
        <>
        <div className="flex justify-center">
          <a
            href="/admin/archive"
            onClick={handleArchiveClick}
            aria-disabled={packing}
            className={`!bg-primary !text-on-primary px-10 py-4 rounded-full font-label text-sm uppercase tracking-widest shadow-lg shadow-primary/20 ${
              packing ? "pointer-events-none opacity-70" : ""
            }`}
          >
            {copy.archiveDownload}
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <article
              key={photo.key}
              className="relative aspect-square rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container-low"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="object-cover w-full h-full"
              />
              <button
                type="button"
                onClick={() => setViewingPhoto(photo)}
                className="absolute inset-0 cursor-zoom-in"
                aria-label={`${copy.viewFullAria}: ${photo.name}`}
              />
              <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-black/55 text-white pl-3.5 pr-2 py-2 pointer-events-none">
                <p className="min-w-0 flex-1 text-sm leading-snug truncate">
                  {photo.name}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRemoveError(null);
                    setPendingRemoval(photo);
                  }}
                  className="pointer-events-auto shrink-0 bg-error text-on-error rounded-full p-1.5 hover:bg-error/90"
                  aria-label={copy.removeAria}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-3 items-center gap-1 bg-black/55 text-white px-3.5 py-2.5 text-xs leading-relaxed pointer-events-none">
                <p className="truncate">{photo.uploadedDateLabel}</p>
                <p className="text-center truncate">{photo.uploadedTimeLabel}</p>
                <p className="text-right truncate">{photo.sizeLabel}</p>
              </div>
            </article>
          ))}
        </div>
        </>
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

      {archiveError ? (
        <p className="text-center text-sm text-error" role="alert">
          {archiveError}
        </p>
      ) : null}

      {removeError ? (
        <p className="text-center text-sm text-error" role="alert">
          {removeError}
        </p>
      ) : null}

      {viewingPhoto ? (
        <div
          className="fixed inset-0 z-[80] bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={viewingPhoto.name}
        >
          <button
            type="button"
            onClick={() => setViewingPhoto(null)}
            className="absolute top-4 right-4 z-10 text-white/90 hover:text-white p-2"
            aria-label={copy.closeFullAria}
          >
            <X className="w-7 h-7" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewingPhoto.url}
            alt={viewingPhoto.name}
            className="w-full h-full object-contain cursor-zoom-out"
            onClick={() => setViewingPhoto(null)}
          />
        </div>
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
