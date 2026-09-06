Type: research
Status: resolved

## Question

For **Next.js 16** App Router (`next` 16.2.4 in this repo), what is the supported way to send a **session-gated `.zip` archive** to the browser as a file download?

Need from Next.js (and Web platform) primary docs in `node_modules/next/dist/docs/` where they apply:

- Route Handler vs Server Action for a binary `Content-Disposition: attachment` response. Can a Server Action stream a zip?
- Streaming a body vs buffering the whole archive in memory.
- Re-verifying the existing admin session (`httpOnly` cookie, `verifySession` / DAL) inside the handler; **401** when missing.
- Headers: `Content-Type`, `Content-Disposition` filename (ASCII `snimki-ot-gostite-YYYY-MM-DD.zip`).
- Anything that changed or is deprecated in Next 16 relative to older `NextResponse` / Route Handler file examples.

Cite each claim back to Next.js docs or the Fetch/HTTP specs they point to.

## Answer

Full notes: [Next.js 16 archive response](../research/02-next-archive-response.md).

Use a **Route Handler** (`route.ts` on a sibling of `/admin`, not next to `page.tsx`). Return `new Response(readableStream, { headers })` with `Content-Type: application/zip` and `Content-Disposition: attachment; filename="snimki-ot-gostite-YYYY-MM-DD.zip"`. Stream chunks (or `FileHandle.readableWebStream()`); do not buffer the finished zip unless it is known-small.

A **Server Action cannot** stream an attachment: returns are serialized for the Action protocol; Actions are POST mutations, not file endpoints.

Call existing `verifySession()` inside the handler; no session → **`401`** (no 403; no roles). The `/admin` RSC check does not cover this URL. Do not `force-static`. `NextResponse` is still fine; 16 did not replace `new Response` for downloads (`middleware` → `proxy` is unrelated).

## Comments

Resolved from the research file above. Host time/memory/size caps stay on [Host limits for archives](03-host-limits-for-archives.md).
