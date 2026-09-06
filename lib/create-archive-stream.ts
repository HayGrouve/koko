import { archiveEntryNames } from "./archive-names";
import { zipStoredEntries } from "./zip-store-stream";
import { photoCdnUrl, type ListedPhoto } from "./uploaded-photos";

export function archivePhotosStream(
  photos: readonly ListedPhoto[],
  appId: string,
): ReadableStream<Uint8Array> {
  const names = archiveEntryNames(photos);
  return zipStoredEntries(
    photos.map((photo, index) => {
      const name = names[index];
      if (!name) {
        throw new Error("archive entry name");
      }
      return {
        name,
        body: () => originalPhotoBody(photoCdnUrl(appId, photo.key)),
      };
    }),
  );
}

function originalPhotoBody(url: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const response = await fetch(url);
      if (!response.ok || response.body === null) {
        controller.error(new Error("cdn"));
        return;
      }
      const reader = response.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
          controller.enqueue(value);
        }
      } finally {
        reader.releaseLock();
      }
    },
  });
}
