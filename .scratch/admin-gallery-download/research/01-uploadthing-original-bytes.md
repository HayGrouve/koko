# UploadThing v7: original bytes for an archive

Question: for this app’s `uploadthing@^7.7.4` stack (`UTApi`, public `ufs.sh` URLs from `key`, `listFiles` / `deleteFiles` already chosen), what official API yields **original file bytes** so a server can pack every uploaded photo?

**Answer:** There is **no** first-party zip, export, or bulk-download API. OpenAPI `6.10.0` and `UTApi` in 7.7.4 only list/manage files and mint URLs. Originals live on the CDN. The official access path is **HTTP GET** of `https://<APP_ID>.ufs.sh/f/<FILE_KEY>` (public ACL) or GET of a short-lived signed `ufsUrl` from `UTApi.generateSignedURL` (private ACL). Collect keys with paginated `listFiles`; list metadata is enough to decide what to fetch. There is **no** `UTApi` method that returns bytes for an already-uploaded file.

Installed package in this repo: `uploadthing@7.7.4` (`node_modules/uploadthing/package.json`).

This app’s router (`app/api/uploadthing/core.ts`) does not set `acl`. Default ACL is **public-read** (unsigned URL). The admin gallery already builds that URL (`lib/uploaded-photos.ts` `photoCdnUrl`). Treat files as public unless the dashboard default was flipped to `private` (paid-plan feature; would break those unsigned thumbs).

---

## 1. No first-party zip / export / bulk download

### REST (complete path list, OpenAPI `info.version` **6.10.0**)

| Method | Path | Role |
| --- | --- | --- |
| GET | `/v6/pollUpload/:fileKey` | Poll upload complete |
| GET / POST | `/v6/serverCallback` | `onUploadComplete` callback data |
| POST | `/v6/prepareUpload` | Presign uploads via file router |
| POST | `/v7/prepareUpload` | Same, v7 |
| POST | `/v6/uploadFiles` | Presign uploads without routes |
| POST | `/v6/completeMultipart` | Finalize multipart (“make the file available for download” = **finish the upload**, not a zip) |
| POST | `/v6/failureCallback` | Mark upload failed |
| POST | `/v6/listFiles` | Paginated metadata |
| POST | `/v6/renameFiles` | Rename |
| POST | `/v6/deleteFiles` | Mark for deletion |
| POST | `/v6/getUsageInfo` | Quota counters |
| POST | `/v7/getAppInfo` | App info |
| POST | `/v6/requestFileAccess` | Presigned **GET URL** for a **private** file |
| POST | `/v6/updateACL` | `public-read` / `private` |

Source: [https://api.uploadthing.com/openapi-spec.json](https://api.uploadthing.com/openapi-spec.json); docs UI [OpenAPI Specification](https://docs.uploadthing.com/api-reference/openapi-spec).

**Missing from the spec:** any path named zip, archive, export, bundle, or bulk-download. `requestFileAccess` returns JSON `{ ufsUrl, url }` — a URL, not bytes.

### SDK (`UTApi` in `uploadthing/server`)

Public methods: `uploadFiles`, `uploadFilesFromUrl`, `deleteFiles`, `getFileUrls` (**deprecated**), `listFiles`, `renameFiles`, `getUsageInfo`, `generateSignedURL`, `getSignedURL`, `updateACL`.

Source: `node_modules/uploadthing/server/index.d.ts` (`class UTApi`). Same set on [UTApi](https://docs.uploadthing.com/api-reference/ut-api).

There is **no** `downloadFiles` / `getFile` / `exportFiles` on `UTApi`.

Internal `downloadFile` in `node_modules/uploadthing/server/index.js` is only used by `uploadFilesFromUrl`: GET an arbitrary remote URL, wrap it as `UTFile`, then **re-upload**. Docs: “the file is first downloaded on your server, before … uploaded to the storage provider” ([uploadFilesFromUrl](https://docs.uploadthing.com/api-reference/ut-api#uploadfilesfromurl)). That is the wrong direction for packing guest originals.

`completeMultipart`’s “available for download” wording is upload finalization, not an archive product ([openapi-spec.json](https://api.uploadthing.com/openapi-spec.json) path `/v6/completeMultipart`).

**Auth for REST (if you used it):** header `x-uploadthing-api-key` from decoded `UPLOADTHING_TOKEN`. Same as list/delete research. Source: OpenAPI `securitySchemes.ApiKeyAuth`; [UTApi token](https://docs.uploadthing.com/api-reference/ut-api).

---

## 2. How to get original bytes

Official file-access page: [Working with Files](https://docs.uploadthing.com/working-with-files). It documents **CDN URLs**, not a bytes API. “Other File Operations” points at `UTApi` / OpenAPI — list, delete, ACL, signed URLs — not a download helper.

### Public ACL (this app’s default)

Construct and GET:

`https://<APP_ID>.ufs.sh/f/<FILE_KEY>`

If `customId` was set at upload: `https://<APP_ID>.ufs.sh/f/<CUSTOM_ID>`.

Do **not** use raw S3/object-store URLs. Legacy `https://utfs.io/f/<FILE_KEY>` still works but is not recommended.

Sources: [Accessing Public Files](https://docs.uploadthing.com/working-with-files); [Access Controls](https://docs.uploadthing.com/concepts/regions-acl) (“By default every file uploaded to UploadThing is accessible simply by it's URL (`<APP_ID>.ufs.sh/f/<FILE_KEY>`).”).

This repo already does that for thumbs:

```ts
// lib/uploaded-photos.ts
`https://${appId}.ufs.sh/f/${key}`
```

`appId` comes from decoding `UPLOADTHING_TOKEN` (`appIdFromUploadthingToken`). The CDN GET is **unauthenticated**. Do not send `UPLOADTHING_TOKEN` or `x-uploadthing-api-key` to `ufs.sh`.

`getFileUrls` / REST `/v6/getFileUrl` is **deprecated**; docs send you to construct the URL instead ([getFileUrls](https://docs.uploadthing.com/api-reference/ut-api#getfileurls), SDK JSDoc on `getFileUrls` in `server/index.d.ts`). OpenAPI 6.10.0 does **not** even list `/v6/getFileUrl`; the SDK still POSTs it (`server/index.js`). Do not use it for the archive.

### Private ACL

Unsigned URL “will not be accessible”; need a short-lived signed URL, then GET that.

**Recommended (v7.5+):** `utapi.generateSignedURL(key, { expiresIn })` → `{ ufsUrl }`. **No** UploadThing API round-trip; HMAC on your server using the API key from the token.

```ts
const { ufsUrl } = await utapi.generateSignedURL(fileKey, { expiresIn: 60 * 60 });
const res = await fetch(ufsUrl);
```

Sources: [generateSignedURL](https://docs.uploadthing.com/api-reference/ut-api#generatesignedurl); [Accessing Private Files](https://docs.uploadthing.com/working-with-files) (docs show `await fetch(url) // Status 200 OK`); implementation `generateSignedURL` in `node_modules/uploadthing/server/index.js` (builds `https://${appId}.${ufsHost}/f/${key}`, default `expiresIn` **`"5 minutes"`**, max **7 days / 604800 s**).

Types: `GenerateSignedURLOptions.expiresIn` default **5min** (`node_modules/uploadthing/dist/types-Bs3w2d_3.d.ts`).

Reference HMAC (same idea, without the SDK): `expires` query (epoch **ms**), `signature=hmac-sha256=…` over `url.href` with the API key. Source: [Working with Files](https://docs.uploadthing.com/working-with-files). Validity: until `expires` **or** the API key is revoked.

**Not recommended:** `utapi.getSignedURL` → POST `/v6/requestFileAccess`. Extra latency; “will be deprecated in UploadThing v8 and removed in v9” (`server/index.d.ts`). OpenAPI: body `fileKey` or `customId`, optional `expiresIn` 1–604800 seconds (default = dashboard). 200: `{ ufsUrl, url }` (`url` deprecated). Auth: same API key header.

`getSignedURL`’s `expiresIn` “can only be used if you allow overrides in your app settings” ([getSignedURL](https://docs.uploadthing.com/api-reference/ut-api#getsignedurl)). `generateSignedURL` types do **not** repeat that dashboard-override caveat (`GenerateSignedURLOptions` vs `GetSignedURLOptions` in `types-Bs3w2d_3.d.ts`).

### What GET returns

Docs do not specify `Content-Type`, `Content-Length`, or that the body is bit-identical to the upload. They treat the CDN object as **the file**: public URL “accessible simply by it's URL”; private example expects **200** and a usable body. Route `contentDisposition` defaults to **`inline`** ([File Routes](https://docs.uploadthing.com/file-routes)); that is a browser hint, not a different object. There is no “thumbnail bytes” vs “original bytes” API — list has no thumbnail field (see prior [list/delete research](../../admin-gallery/research/01-uploadthing-list-delete.md)).

Do not fetch storage-provider URLs ([Working with Files](https://docs.uploadthing.com/working-with-files)).

---

## 3. Public vs private for **this** app

| Fact | Source |
| --- | --- |
| Default ACL is public URL access | [Regions & ACL](https://docs.uploadthing.com/concepts/regions-acl) |
| Route can set `acl: "public-read" \| "private"` only if dashboard **Allow Overriding ACL** is on | [File Routes – acl](https://docs.uploadthing.com/file-routes) |
| This router does **not** set `acl` | `app/api/uploadthing/core.ts` |
| Private files + regions are **paid-plan** | [Regions & ACL](https://docs.uploadthing.com/concepts/regions-acl) (“only available on paid plans”) |
| Admin listing uses unsigned `ufs.sh` URLs | `lib/uploaded-photos.ts`, `lib/fetch-gallery-page.ts` |

**Implication:** implement the archive as **unsigned CDN GET** of the same URL the gallery already uses. Use `generateSignedURL` only if the dashboard default is `private` (or a file was flipped via `updateACL`). `listFiles` does **not** return ACL; you cannot tell public vs private from list metadata (OpenAPI `/v6/listFiles` file object: `id`, `customId`, `key`, `name`, `status`, `size`, `uploadedAt` only).

`updateACL` exists (`public-read` | `private`) but is not required to **read** public files ([updateACL](https://docs.uploadthing.com/api-reference/ut-api#updateacl); OpenAPI `/v6/updateACL`).

---

## 4. Collecting the full set: `listFiles` pagination

Unchanged from [01-uploadthing-list-delete.md](../../admin-gallery/research/01-uploadthing-list-delete.md); still matches 7.7.4 + OpenAPI 6.10.0.

```ts
const page = await utapi.listFiles({ limit: 500, offset: 0 });
// page.files, page.hasMore
```

| Option | Default | Constraints |
| --- | --- | --- |
| `limit` | 500 | OpenAPI `minimum` 0, `maximum` **100000** |
| `offset` | 0 | `minimum` 0 |
| `hasMore` | — | more pages exist |

No cursor. Loop `offset += limit` while `hasMore`. No filter by router slug, date, or name. Listing is the **whole app** for the API key ([listFiles](https://docs.uploadthing.com/api-reference/ut-api#listfiles)).

This gallery pages UI at `LIST_PAGE_SIZE = 50` (`lib/uploaded-photos.ts`). That is an app choice. An archive walk may use a larger `limit` (docs default 500, spec max 100000).

Docs still say: do not use `listFiles` as the primary DB; it is for **admin / sync / debug** ([listFiles](https://docs.uploadthing.com/api-reference/ut-api#listfiles)). This project already accepted that for the gallery.

---

## 5. Is list metadata enough?

**Yes, for deciding what to GET and how to name entries.** No second “get file” call is required for public files.

`listFiles` item (SDK + OpenAPI):

| Field | Use for archive |
| --- | --- |
| `key` | CDN path; unique |
| `name` | Original filename (this map’s zip entry name) |
| `size` | Bytes; planning / mismatch checks (docs do not require you to verify) |
| `status` | Skip anything not `"Uploaded"` |
| `customId` | `null` here (no `UTFiles`); unused for URL |
| `uploadedAt` | Not required to fetch bytes |
| `id` | Deprecated; not a CDN id |

**Not on list:** `url` / `ufsUrl`, MIME, ACL, router slug, dimensions, thumbnail.

SDK `status` union: `"Deletion Pending" | "Failed" | "Uploaded" | "Uploading"` (`server/index.d.ts`). OpenAPI `status` is an untyped string with example `"Uploaded"`.

This app already filters `status === "Uploaded"` (`uploadedPhotos` in `lib/uploaded-photos.ts`). `"Deletion Pending"` matches async delete (“deleted at the storage provider shortly after” — OpenAPI `/v6/deleteFiles`). Fetching those is undefined (object may already be gone). `"Uploading"` / `"Failed"` are not finished objects.

No per-file metadata REST besides deprecated `getFileUrls` (URL only) and `requestFileAccess` (signed URL only).

---

## 6. Rate limits, timeouts, failure modes when fetching many files

### Published

| Topic | What primary sources say |
| --- | --- |
| `listFiles` rate limit | **No number.** Same warning as before: likely to be rate-limited; treat heavy polling as unsupported (prior research; [listFiles](https://docs.uploadthing.com/api-reference/ut-api#listfiles); UTApi intro latency note). |
| REST errors | OpenAPI list / `requestFileAccess` / `updateACL`: **400**, **401**, **500** only. **No 429** in the spec. |
| CDN GET rate limit | **Not documented** on docs.uploadthing.com or OpenAPI (CDN is not `api.uploadthing.com`). |
| CDN timeout | **Not documented.** |
| Download quota | Marketing pricing: Free **2GB App** includes “Unlimited uploads and downloads” ([uploadthing.com/pricing](https://uploadthing.com/pricing)). Storage cap is separate (`getUsageInfo.limitBytes`). Not an API QPS figure. |
| `generateSignedURL` | Local; no REST. Failure: bad `expiresIn` → `BAD_REQUEST`; bad token → `INVALID_SERVER_CONFIG` (`server/index.js`). |
| Private unsigned GET | File “will not be accessible by it's URL” ([Regions & ACL](https://docs.uploadthing.com/concepts/regions-acl)). HTTP status for that case is **not** specified. |
| After `deleteFiles` | Deleted “shortly after”; list may show `"Deletion Pending"`. CDN 404 timing **not** specified (prior research). |
| SDK HTTP | `HttpClient.filterStatusOk` — non-2xx fails; `executeAsync` throws (`server/index.js`). Applies to `listFiles` / `getSignedURL`, **not** to your own `fetch` of `ufs.sh`. |

### Not found in primary sources

- Max concurrent CDN GETs
- Whether a burst of server-side GETs is throttled
- Required `User-Agent` / headers on `ufs.sh`
- Retry / checksum API
- Per-request byte cap on the CDN
- Guarantee that `Content-Length` equals `listFiles[].size`

Host (Next/Vercel) time and memory for packing many 256 MB images is **out of scope here** (ticket `03-host-limits-for-archives`). UploadThing does not document a “how many originals you may pull in one go” cap beyond storage quota and the unpublished `listFiles` rate-limit warning.

---

## 7. Recommended server sequence (docs-shaped, not an implementation)

1. `new UTApi()` (server-only; `UPLOADTHING_TOKEN`).
2. Page `listFiles` until `!hasMore`.
3. Keep `status === "Uploaded"` (app convention + SDK union).
4. For each `key`, GET `https://<appId>.ufs.sh/f/<key>` (public) **or** GET `generateSignedURL(key).ufsUrl` (private).
5. Pack those response bodies. UT has no zip endpoint.

`getUsageInfo` (`filesUploaded`, `appTotalBytes`) can sanity-check scale; it does not replace listing and does not return keys ([getUsageInfo](https://docs.uploadthing.com/api-reference/ut-api) / OpenAPI `/v6/getUsageInfo`).

---

## Sources (primary)

1. https://docs.uploadthing.com/working-with-files — public `ufs.sh` URL; do not use raw S3; private HMAC + `fetch`; `/requestFileAccess` is slower
2. https://docs.uploadthing.com/api-reference/ut-api — `UTApi` methods; no download helper; `listFiles` pagination; `generateSignedURL` / `getSignedURL`; `getFileUrls` deprecated
3. https://docs.uploadthing.com/concepts/regions-acl — default public URL; `public-read` vs `private`; private/regions on paid plans
4. https://docs.uploadthing.com/file-routes — route `acl`, `contentDisposition` default `inline`
5. https://docs.uploadthing.com/api-reference/openapi-spec — UI; spec https://api.uploadthing.com/openapi-spec.json (`6.10.0`; no zip/export; `listFiles` limit max 100000; `requestFileAccess`)
6. https://docs.uploadthing.com/v7 — REST host `api.uploadthing.com`; token
7. `node_modules/uploadthing/server/index.d.ts`, `server/index.js`, `dist/types-Bs3w2d_3.d.ts`, `package.json` (7.7.4)
8. `app/api/uploadthing/core.ts`, `lib/uploaded-photos.ts`, `lib/fetch-gallery-page.ts`
9. https://uploadthing.com/pricing — “Unlimited uploads and downloads” on free 2GB; private files on paid
10. `.scratch/admin-gallery/research/01-uploadthing-list-delete.md` — list/delete facts reused where still matching 7.7.4

**Not found in primary sources:** zip/export API; numeric CDN or `listFiles` rate limit; CDN GET timeout/status table; ACL field on `listFiles`; `UTApi` method that returns original bytes.
