export const LIST_PAGE_SIZE = 50;

export type ListedPhoto = {
  key: string;
  name: string;
  size: number;
  uploadedAt: number;
  status: string;
};

export function appIdFromUploadthingToken(token: string): string | null {
  if (token.length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(token, "base64").toString("utf8"),
    ) as { appId?: unknown };
    return typeof parsed.appId === "string" && parsed.appId.length > 0
      ? parsed.appId
      : null;
  } catch {
    return null;
  }
}

export function photoCdnUrl(appId: string, key: string): string {
  return `https://${appId}.ufs.sh/f/${key}`;
}

export function uploadedPhotos(files: readonly ListedPhoto[]): ListedPhoto[] {
  return files.filter((file) => file.status === "Uploaded");
}

export function formatByteSize(bytes: number): string {
  const megabytes = bytes / 1_000_000;
  return `${megabytes.toLocaleString("bg-BG", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  })} МБ`;
}

export function formatUploadedDate(uploadedAtMs: number): string {
  return new Date(uploadedAtMs).toLocaleDateString("bg-BG", {
    dateStyle: "short",
  });
}

export function formatUploadedTime(uploadedAtMs: number): string {
  return new Date(uploadedAtMs).toLocaleTimeString("bg-BG", {
    timeStyle: "short",
  });
}

export const ARCHIVE_LIST_PAGE_SIZE = 500;

export type ArchiveListPage = {
  files: readonly ListedPhoto[];
  hasMore: boolean;
};

export async function collectUploadedPhotosForArchive(
  listPage: (args: {
    limit: number;
    offset: number;
  }) => Promise<ArchiveListPage>,
): Promise<ListedPhoto[]> {
  const collected: ListedPhoto[] = [];
  let offset = 0;

  for (;;) {
    const page = await listPage({
      limit: ARCHIVE_LIST_PAGE_SIZE,
      offset,
    });
    collected.push(...uploadedPhotos(page.files));
    if (!page.hasMore) {
      return collected;
    }
    offset += ARCHIVE_LIST_PAGE_SIZE;
  }
}
