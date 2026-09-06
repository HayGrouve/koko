import { UTApi } from "uploadthing/server";
import { verifySession } from "@/lib/admin-dal";
import { archiveDownloadFilename } from "@/lib/archive-names";
import { archivePhotosStream } from "@/lib/create-archive-stream";
import { copy } from "@/lib/admin-copy";
import {
  appIdFromUploadthingToken,
  collectUploadedPhotosForArchive,
} from "@/lib/uploaded-photos";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  if (!(await verifySession())) {
    return new Response(copy.archiveError, {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const appId = appIdFromUploadthingToken(process.env.UPLOADTHING_TOKEN ?? "");
  if (!appId) {
    return new Response(copy.archiveError, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const utapi = new UTApi();
    const photos = await collectUploadedPhotosForArchive((opts) =>
      utapi.listFiles(opts),
    );
    if (photos.length === 0) {
      return new Response(copy.archiveError, {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const filename = archiveDownloadFilename(new Date());
    return new Response(archivePhotosStream(photos, appId), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(copy.archiveError, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
