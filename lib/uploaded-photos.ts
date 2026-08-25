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

export function formatUploadedAt(uploadedAtMs: number): string {
  return new Date(uploadedAtMs).toLocaleString("bg-BG", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
