import "server-only";

import { UTApi } from "uploadthing/server";
import {
  LIST_PAGE_SIZE,
  appIdFromUploadthingToken,
  formatByteSize,
  formatUploadedDate,
  formatUploadedTime,
  photoCdnUrl,
  uploadedPhotos,
} from "@/lib/uploaded-photos";

export type GalleryPhoto = {
  key: string;
  name: string;
  sizeLabel: string;
  uploadedDateLabel: string;
  uploadedTimeLabel: string;
  url: string;
};

export async function fetchGalleryPage(offset: number): Promise<{
  photos: GalleryPhoto[];
  hasMore: boolean;
}> {
  const appId = appIdFromUploadthingToken(process.env.UPLOADTHING_TOKEN ?? "");
  if (!appId) {
    throw new Error("UploadThing app id is missing");
  }

  const utapi = new UTApi();
  const page = await utapi.listFiles({ limit: LIST_PAGE_SIZE, offset });
  const photos = uploadedPhotos([...page.files]).map((listed) => ({
    key: listed.key,
    name: listed.name,
    sizeLabel: formatByteSize(listed.size),
    uploadedDateLabel: formatUploadedDate(listed.uploadedAt),
    uploadedTimeLabel: formatUploadedTime(listed.uploadedAt),
    url: photoCdnUrl(appId, listed.key),
  }));

  return { photos, hasMore: page.hasMore };
}
