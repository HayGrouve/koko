# Spec: admin gallery archive

Add a control on the existing **admin gallery** so the couple can take one **archive** of every uploaded photo. Do not change the public uploader (`/`, `/success`). Do not rewrite the gate, listing, or removal. Do not add a database.

Vocabulary: [CONTEXT.md](../../CONTEXT.md). Decisions: [map](map.md), [UploadThing original bytes](issues/01-uploadthing-original-bytes.md), [Next.js archive response](issues/02-next-archive-response.md), [Host limits for archives](issues/03-host-limits-for-archives.md), [Host posture for the archive](issues/05-host-posture-for-the-archive.md). Gallery behaviour that this spec does not repeat: [password-gated admin gallery](../admin-gallery/spec.md).

---

## Who and where

The couple, already through the **gate**, on **`/admin`**. Guests never see this control. Do not add a public link to `/admin` or `/admin/archive`.

Language: **Bulgarian**, same `Display` / `Narrative` / `Header` and primary pill as the gallery. No dashboard chrome. Do not say Export, Download all, Backup, or Bundle.

---

## Control

Primary pill **above the grid**, not next to **«Затвори достъпа»** (that stays a quiet text control).

| When | Behaviour |
| --- | --- |
| Empty gallery (`photos.length === 0` and `!hasMore`) | Hide the pill. Same empty copy as today. |
| At least one uploaded photo in the loaded view, or `hasMore` | Show **«Изтегли всички»**. |
| After click, until the browser has taken the attachment or a non-200 returns | Disable the pill. No percent. No confirmation. |

The click starts a same-origin **GET `/admin/archive`**. The session cookie is `SameSite=Lax` and will be sent. Do **not** `fetch` the zip into a `Blob` and re-save it — that buffers the whole archive in the tab. Use an `<a href="/admin/archive">` (styled as the pill) or a hidden iframe / `location.assign` that lets the browser handle `Content-Disposition: attachment`.

If the GET is not 200 (401, 500, 504): re-enable the pill and show **«Не успяхме да съберем снимките.»** A 401 means the session is gone; they can use **«Затвори достъпа»** / the gate as today — do not invent a second gate.

---

## Route

`app/admin/archive/route.ts` → **GET `/admin/archive`**. Cannot sit next to `app/admin/page.tsx` (page + route conflict).

Not a Server Action. Actions cannot stream an attachment.

```ts
export const runtime = "nodejs";
export const maxDuration = 300; // Hobby Fluid max. Pro may set 800.
```

If the Vercel project predates 23 Apr 2025 and Fluid is off, turn Fluid on so the clock is not 10s/60s. Do not require a Pro plan. Do not set `dynamic = 'force-static'`. Do not use the Edge runtime.

Call existing `verifySession()` **inside** this handler. `/admin` RSC is not a gate for this URL. Optional `proxy.ts` must not be the only check.

| Session | Response |
| --- | --- |
| Missing or invalid | **401**, empty body. No 403 (no roles). |
| Valid | Pack (below) or an error status **before** attachment headers. |

Do not write cookies while streaming.

---

## What goes in the archive

Every UploadThing file with `status === "Uploaded"` for this app token — all `listFiles` pages, not the 50 tiles on screen. Skip `Uploading`, `Failed`, `Deletion Pending`.

`UTApi` is **server-only**. Page with `limit` ≤ 100000 (500 is enough) and `offset` until `!hasMore`. List fields `name`, `key`, `size`, `status` are enough. No second metadata call. No app database.

If the full walk finds **zero** uploaded photos (removal race): **404**, no attachment, same UI error copy.

Original bytes: **HTTP GET** `https://<appId>.ufs.sh/f/<key>` (`appId` from `UPLOADTHING_TOKEN`, same helper as the gallery). Unsigned. Do not use `utfs.io`, raw S3 URLs, or `getFileUrls`. This app’s router does not set `acl`; do not add `generateSignedURL` unless the UploadThing dashboard is switched to private.

There is no UploadThing zip/export API.

---

## How to pack

Stream a `.zip` (`Content-Type: application/zip`). Pick any Node zip library that can **append from a stream**. Constraints:

- `return new Response(readableStream, { headers })` — zip chunks leave as produced.
- Never `arrayBuffer()` / `Buffer.concat` a whole original.
- Never assemble the finished zip in memory.
- Never write the archive to `/tmp` (Vercel cap 500 MB).
- One original at a time into the zip (keeps RAM and file descriptors down).
- Omit `Content-Length` (chunked).

**Headers (success only):**

```http
Content-Type: application/zip
Content-Disposition: attachment; filename="snimki-ot-gostite-YYYY-MM-DD.zip"
Cache-Control: private, no-store
```

`YYYY-MM-DD` is the request date in **Europe/Sofia**. ASCII `filename=` only — no `filename*`.

**Entry names:** stored UploadThing `name`, basename only (no `/` or `..`). First photo keeps the name. Later clashes: insert a short unique piece of `key` before the extension — `IMG_1234.jpg` then `IMG_1234-a1b2c3.jpg` (six characters from the key is enough).

**Fail the whole request** if `listFiles` throws or any CDN GET is not a successful body. Prefer failing **before** the 200 + attachment headers (then 500, no zip). If a fetch fails after the stream has started, abort the stream (truncated download). UI copy is the same either way. Do not ship a zip that silently dropped photos.

Timeout (**504** `FUNCTION_INVOCATION_TIMEOUT`) and OOM are the same failure as a bad fetch. Typical guest JPEGs fit; a pile of 256 MB originals may not. That is accepted. Do not split into several archives. Do not add Workflows or a Node/`Docker` host requirement.

No server-side lock against two overlapping GETs. The pill disable is enough.

---

## Copy (this feature)

| Surface | Bulgarian |
| --- | --- |
| Archive pill | Изтегли всички |
| Archive error | Не успяхме да съберем снимките. |

Do not add English admin jargon. Existing gallery strings stay as in [password-gated admin gallery](../admin-gallery/spec.md).

---

## Out of scope (do not build)

- Changing gate, listing, load-more, or removal
- Per-photo download, email, Drive, WeTransfer
- Progress bar, confirmation, several zips, empty zip
- App database / persisting keys
- `generateSignedURL` on the current public ACL
- Self-host / Docker / Workflows as a requirement
- Experimental Next `unauthorized()` / `authInterrupts`

---

## Done when

- Empty gallery has no archive pill; a non-empty gallery shows **«Изтегли всички»**
- Click GETs `/admin/archive` with the session cookie and saves `snimki-ot-gostite-YYYY-MM-DD.zip`
- Zip contains every `Uploaded` photo (all list pages), clash-safe names, originals from `ufs.sh` (not thumbnails)
- No session → 401; list/fetch/timeout failure → no successful partial archive and **«Не успяхме да съберем снимките.»**
- Public `/` and `/success` unchanged; no new public link
