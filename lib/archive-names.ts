export type ArchivePhotoName = {
  name: string;
  key: string;
};

export function archiveEntryNames(
  photos: readonly ArchivePhotoName[],
): string[] {
  const used = new Set<string>();
  return photos.map((photo) => {
    const base = flattenEntryName(photo.name);
    if (!used.has(base)) {
      used.add(base);
      return base;
    }
    const unique = uniqueClashingName(base, photo.key, used);
    used.add(unique);
    return unique;
  });
}

export function archiveDownloadFilename(now: Date): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sofia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `snimki-ot-gostite-${date}.zip`;
}

function flattenEntryName(name: string): string {
  const segments = name.replaceAll("\\", "/").split("/");
  const last = segments.at(-1)?.replaceAll("..", "") ?? "";
  return last.length > 0 ? last : "photo";
}

function uniqueClashingName(
  base: string,
  key: string,
  used: Set<string>,
): string {
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  const piece = key.replace(/[^A-Za-z0-9]/g, "").slice(-6) || key.slice(-6);
  const candidate = `${stem}-${piece}${ext}`;
  if (!used.has(candidate)) {
    return candidate;
  }
  let n = 2;
  while (used.has(`${stem}-${piece}-${n}${ext}`)) {
    n += 1;
  }
  return `${stem}-${piece}-${n}${ext}`;
}
