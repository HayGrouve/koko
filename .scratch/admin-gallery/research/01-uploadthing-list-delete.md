# UploadThing v7: list and delete files

Question: for this app’s `uploadthing@^7.7.4` / `@uploadthing/react@^7.3.3` stack, what official **server** APIs list and delete files?

**Answer:** Use the server SDK class `UTApi` from `uploadthing/server`: `listFiles` and `deleteFiles`. Those wrap REST `POST https://api.uploadthing.com/v6/listFiles` and `POST https://api.uploadthing.com/v6/deleteFiles`. The file-router slug `imageUploader` is **not** a list/delete filter. You do **not** have to persist keys on upload in order to list; `listFiles` returns files for the **whole app** tied to the API key. Official docs still recommend persisting metadata for product queries; they call `listFiles` suitable for admin/debug/sync.

Installed package in this repo: `uploadthing@7.7.4` (`node_modules/uploadthing/package.json`).

---

## 1. Exact APIs

### SDK (what this Next app should call)

```ts
import { UTApi } from "uploadthing/server";

export const utapi = new UTApi(); // or `new UTApi({ token: process.env.UPLOADTHING_TOKEN })`

const page = await utapi.listFiles({ limit: 500, offset: 0 });
const result = await utapi.deleteFiles(fileKey); // or string[]
```

Sources:

- Docs: [UTApi](https://docs.uploadthing.com/api-reference/ut-api)
- Types: `node_modules/uploadthing/server/index.d.ts` (`class UTApi`, methods `listFiles`, `deleteFiles`)
- Implementation: `node_modules/uploadthing/server/index.js` and upstream [packages/uploadthing/src/sdk/index.ts](https://github.com/pingdotgg/uploadthing/blob/main/packages/uploadthing/src/sdk/index.ts)

`UTApi` is **server-only**. Calling it in the browser throws `UploadThingError` with message `The \`utapi\` can only be used on the server.` (`guardServerOnly` in `node_modules/uploadthing/server/index.js`).

This repo’s router (`app/api/uploadthing/core.ts`) only defines `imageUploader` and logs `file.url` in `onUploadComplete`. It does not persist keys. That does **not** block listing: listing is a separate app-wide API (see §5).

### REST (what the SDK actually hits)

v7 moved REST to `https://api.uploadthing.com` with path versioning (`/v6/...`). Example from the v7 migration guide:

```
POST https://api.uploadthing.com/v6/listFiles
```

Sources:

- [Migrate from v6 to v7](https://docs.uploadthing.com/v7)
- OpenAPI: [https://api.uploadthing.com/openapi-spec.json](https://api.uploadthing.com/openapi-spec.json) (spec `info.version` **6.10.0**; docs UI: [OpenAPI Specification](https://docs.uploadthing.com/api-reference/openapi-spec))

| Action | SDK | HTTP |
| --- | --- | --- |
| List | `utapi.listFiles(opts?)` | `POST /v6/listFiles` |
| Delete | `utapi.deleteFiles(keys, opts?)` | `POST /v6/deleteFiles` |

SDK request helper: `HttpClientRequest.post(pathname)` with JSON body (`node_modules/uploadthing/server/index.js`, `requestUploadThing`).

There is **no** list/delete method on `@uploadthing/react`. Client helpers only start uploads against the file router.

---

## 2. Identifiers: `key`, `url`, `customId`, `id`

| Identifier | Role | List returns it? | Delete accepts it? |
| --- | --- | --- | --- |
| `key` (fileKey) | Storage object id; used in CDN path | Yes, `files[].key` | Yes (default). SDK sends `{ fileKeys: string[] }` |
| `customId` | Optional id **you** set at upload (middleware `UTFiles` or `UTFile`) | Yes, `files[].customId` (`string \| null`) | Yes if `opts.keyType === "customId"`. SDK sends `{ customIds: string[] }` |
| `url` / `ufsUrl` | CDN URL, **not** a delete id | **No** on list | No |
| `id` | Internal file id | Yes, but OpenAPI marks `id` **deprecated** | REST still has deprecated body field `files` (file ids, `maxLength: 36`). v7 SDK **does not** send it |

Delete option type (`DeleteFilesOptions`):

```ts
keyType?: "fileKey" | "customId"; // default "fileKey"
```

(`node_modules/uploadthing/dist/types-Bs3w2d_3.d.ts`; docs [deleteFiles](https://docs.uploadthing.com/api-reference/ut-api#deletefiles) since 6.4)

Constructor `defaultKeyType` can change the default for all file operations ([UTApi options](https://docs.uploadthing.com/api-reference/ut-api)).

OpenAPI constraints on delete body:

- `fileKeys[]`: string, `maxLength` **300**
- `customIds[]`: string, `maxLength` **128**
- `files[]`: deprecated list of file ids, `maxLength` **36**

Source: [openapi-spec.json](https://api.uploadthing.com/openapi-spec.json) path `/v6/deleteFiles`.

**How to get a display URL without list returning one:** construct it from the key (and optionally customId):

`https://<APP_ID>.ufs.sh/f/<FILE_KEY>`  
If `customId` was set: `https://<APP_ID>.ufs.sh/f/<CUSTOM_ID>`

Legacy `https://utfs.io/f/<FILE_KEY>` is still supported but not recommended.

Source: [Working with Files](https://docs.uploadthing.com/working-with-files)

On upload complete, `UploadedFileData` includes `key`, deprecated `url` / `appUrl`, and `ufsUrl` (`node_modules/uploadthing/dist/types-Bs3w2d_3.d.ts`; this app logs `file.url` in `app/api/uploadthing/core.ts`).

This app does **not** set `customId` (no `.middleware` / `UTFiles`). Guest uploads will have `customId: null` unless that is added later. Source: [File Routes – middleware / UTFiles](https://docs.uploadthing.com/file-routes).

---

## 3. Auth (v7: token, not `UPLOADTHING_SECRET`)

**Required env (v7):** `UPLOADTHING_TOKEN`  
**Constructor option:** `token` (overrides env). Default is `env.UPLOADTHING_TOKEN`.

Sources:

- [UTApi constructor – token](https://docs.uploadthing.com/api-reference/ut-api) (since 7.0)
- [v7 migration: `UPLOADTHING_SECRET` is now `UPLOADTHING_TOKEN`](https://docs.uploadthing.com/v7)
- Types: `UTApiOptions.token` in `node_modules/uploadthing/dist/types-Bs3w2d_3.d.ts`

The token is a base64 JSON blob containing **app id**, **regions**, and **API key** (`sk_…`). The SDK decodes it and sends the API key on REST calls:

Header: `x-uploadthing-api-key: <apiKey>`  
Also: `x-uploadthing-version`, `x-uploadthing-be-adapter: server-sdk`

Sources:

- OpenAPI `securitySchemes.ApiKeyAuth`: header `x-uploadthing-api-key` ([openapi-spec.json](https://api.uploadthing.com/openapi-spec.json))
- SDK `requestUploadThing` in `node_modules/uploadthing/server/index.js`
- Token shape: `UploadThingToken` in `node_modules/uploadthing/dist/types-Bs3w2d_3.d.ts` (`apiKey`, `appId`, `regions`, `ingestHost`)

v7 migration: if you used `config: { uploadthingSecret, uploadthingAppId }`, replace with `token`.

**401** if the header is missing/invalid. OpenAPI: “Your request was not authorized, either due to missing or invalid API key provided.” Schema `ErrUnauthorized`: `{ error: string, data?: unknown }`.

SDK missing/invalid token surfaces as `UploadThingError` code `INVALID_SERVER_CONFIG` (`ConfigError` catch in `requestUploadThing`).

Do not put the token in client bundles. `UTApi` is server-only.

---

## 4. `listFiles` metadata, pagination, filters, limits

### Return shape (v7.7.4 SDK + current OpenAPI)

```ts
{
  files: readonly {
    name: string;
    size: number;          // bytes
    customId: string | null;
    key: string;
    id: string;            // OpenAPI: deprecated
    status: "Deletion Pending" | "Failed" | "Uploaded" | "Uploading";
    uploadedAt: number;    // OpenAPI example 1717213483400 → epoch ms
  }[];
  hasMore: boolean;
}
```

Sources:

- `node_modules/uploadthing/server/index.d.ts` (`listFiles` return type)
- SDK schema in `node_modules/uploadthing/server/index.js` (`ListFileResponse`)
- [openapi-spec.json](https://api.uploadthing.com/openapi-spec.json) `/v6/listFiles` 200 body (`hasMore`, `files[]` required fields as above)
- `size` + `uploadedAt` added in [PR #1080](https://github.com/pingdotgg/uploadthing/pull/1080) (closes [issue #899](https://github.com/pingdotgg/uploadthing/issues/899))

OpenAPI description of `listFiles`: “List files for the current app. Response is paginated.”

### What is **not** in the list payload

- No `url`, `ufsUrl`, `appUrl`
- No thumbnail URL or image dimensions
- No MIME type
- No file-router slug (`imageUploader`)
- No guest-facing metadata (this app never stores names anyway)

To show a thumbnail in an admin gallery: use the constructed CDN URL from `key` (public ACL) or `generateSignedURL(key)` if files are private ([Working with Files](https://docs.uploadthing.com/working-with-files), [generateSignedURL](https://docs.uploadthing.com/api-reference/ut-api#generatesignedurl)).

Older v6 docs example omitted `size` / `uploadedAt` / `hasMore` and showed a **bare array**; that example is stale relative to 7.7.4 types. Source: [v6 UTApi listFiles](https://v6.docs.uploadthing.com/api-reference/ut-api). Current current-docs page still only types the return as generic `object` ([listFiles](https://docs.uploadthing.com/api-reference/ut-api#listfiles)); **trust the package types + OpenAPI** for fields.

### Pagination

`ListFilesOptions`:

```ts
{ limit?: number; offset?: number }
```

Docs defaults: `limit` **500**, `offset` **0** (documented as since 6.1 on current UTApi page; v6 page says pagination since 6.0.5).

OpenAPI:

- `limit`: number, `minimum` 0, `maximum` **100000**, default 500
- `offset`: number, `minimum` 0, default 0
- `hasMore`: whether more files exist

There is **no** cursor. Loop `offset += limit` while `hasMore`.

Sources: [listFiles parameters](https://docs.uploadthing.com/api-reference/ut-api#listfiles), OpenAPI requestBody, `ListFilesOptions` in `node_modules/uploadthing/dist/types-Bs3w2d_3.d.ts`.

### Filters

**None** in the official options: no filter by router slug, prefix, date, status, or name. Listing is the entire app for that API key.

Docs: “all files that have been uploaded to the application your API key corresponds to.” ([listFiles](https://docs.uploadthing.com/api-reference/ut-api#listfiles))

If other routes (or server `uploadFiles`) land in the same UploadThing app, they will appear in the same list.

### Rate limits / “don’t use as primary DB”

Docs: do **not** use `listFiles` as the primary data source; persist `key`, `url`, etc. in your own DB for latency and arbitrary queries. `listFiles` is “best suited for **administrative tasks**, one-time data synchronization, or debugging.” ([listFiles](https://docs.uploadthing.com/api-reference/ut-api#listfiles); same warning at the top of [UTApi](https://docs.uploadthing.com/api-reference/ut-api))

Maintainer comment on [#899](https://github.com/pingdotgg/uploadthing/issues/899): they “will likely be rate-limiting requests to this endpoint.” **No numeric rate limit is published** in the OpenAPI spec or UTApi docs as of this research. Treat heavy polling as unsupported.

---

## 5. Must you persist keys on upload?

**No, not for listing the app’s files.** `listFiles` is app-scoped via the API key. This repo can list guest photos without writing keys in `onUploadComplete`.

**Yes, if you need anything list cannot do:** filter by `imageUploader`, captions, guest identity, stable URLs without reconstructing them, or avoiding UT list latency/rate risk. Docs recommend persisting in `.onUploadComplete()` or after `uploadFiles()`. ([UTApi intro](https://docs.uploadthing.com/api-reference/ut-api), [onUploadComplete](https://docs.uploadthing.com/file-routes#on-upload-complete))

Map decision for this project: “List and remove via UploadThing server APIs; do not add an app database for this effort.” That matches UT’s stated admin use of `listFiles`, with the caveats above (pagination via `limit`/`offset`/`hasMore`; no router filter; no thumbnail field).

Delete **does** need a `key` or `customId`. Those come from `listFiles` (or from persisted upload metadata). You cannot delete by URL.

---

## 6. Delete: one vs many, URL after delete, errors

### One vs many

SDK: `keys: string | string[]`. One key or a batch. ([deleteFiles](https://docs.uploadthing.com/api-reference/ut-api#deletefiles), since 4.0; array since 5.0)

REST: arrays `fileKeys` or `customIds` (OpenAPI). Admin product choice of “one photo at a time” is an app constraint, not an API constraint.

### Return value

```ts
{ success: boolean; deletedCount: number }
```

Sources: `node_modules/uploadthing/server/index.d.ts`; OpenAPI 200 schema for `/v6/deleteFiles`. Current UTApi docs only say Returns: `object` — incomplete vs the package.

OpenAPI does **not** document whether `deletedCount` is 0 for unknown keys vs throwing. Do not assume 404 for a missing key; only 200 / 400 / 401 / 500 are specified.

### What happens to the URL

OpenAPI description of `deleteFiles`:

> **Mark files for deletion. The files will be deleted at the storage provider shortly after.**

So deletion is **asynchronous** at the storage provider. List `status` includes `"Deletion Pending"`, which matches that model (SDK literal union; OpenAPI `status` is an untyped string with example `"Uploaded"`).

Official docs **do not** specify CDN TTL, whether `https://<APP_ID>.ufs.sh/f/<KEY>` immediately 404s, or cache behavior. Working-with-files only documents URL **shape**, not post-delete lifetime.

Practical implication: after a successful `deleteFiles`, treat the object as doomed; a brief period of still-serving bytes is consistent with “shortly after” and `"Deletion Pending"`, but that timing is not quantified in primary docs.

### Errors (documented)

REST (OpenAPI, both list and delete):

| Status | Meaning |
| --- | --- |
| 400 | Invalid request input (`ErrBadRequest`: `{ error, data? }`) |
| 401 | Missing/invalid API key (`ErrUnauthorized`) |
| 500 | Unexpected (`ErrInternalServerError`) |

SDK: HTTP client uses `HttpClient.filterStatusOk`, so non-2xx become failures; `executeAsync` squashes Effect failures and **throws**. Invalid token: `INVALID_SERVER_CONFIG`. Browser: `INTERNAL_SERVER_ERROR` / “utapi can only be used on the server.” (`node_modules/uploadthing/server/index.js`)

No documented per-key error array on delete (unlike `uploadFiles`, which returns `{ data, error }` per file).

---

## 7. This repo’s `imageUploader` constraint

```ts
// app/api/uploadthing/core.ts
imageUploader: f({ image: { maxFileSize, maxFileCount } })
  .onUploadComplete(async ({ file }) => {
    console.log("Upload complete for file:", file.url);
  }),
```

- Upload route slug does not appear on list/delete APIs.
- No `customId` → delete with `fileKey` (`files[].key` from `listFiles`).
- No local persistence of keys; listing the UT app is the intended admin data path for ticket 01.

---

## Sources (primary)

1. https://docs.uploadthing.com/api-reference/ut-api — `UTApi`, `listFiles`, `deleteFiles`, `token` / `UPLOADTHING_TOKEN`
2. https://docs.uploadthing.com/v7 — secret → token; REST host `api.uploadthing.com`; `POST /v6/listFiles`
3. https://docs.uploadthing.com/working-with-files — CDN URL pattern; `customId` in path; do not use raw S3 URLs
4. https://docs.uploadthing.com/file-routes — `onUploadComplete` / `UTFiles` `customId`
5. https://docs.uploadthing.com/api-reference/openapi-spec — UI; spec file https://api.uploadthing.com/openapi-spec.json
6. https://github.com/pingdotgg/uploadthing/blob/main/packages/uploadthing/src/sdk/index.ts — SDK REST paths, headers, response schemas
7. `node_modules/uploadthing/server/index.d.ts`, `server/index.js`, `dist/types-Bs3w2d_3.d.ts`, `package.json` (7.7.4)
8. https://github.com/pingdotgg/uploadthing/pull/1080 — `size` / `uploadedAt` on list
9. https://v6.docs.uploadthing.com/api-reference/ut-api — historical list example (stale vs v7 types); v6 `UPLOADTHING_SECRET`

**Not found in primary sources:** numeric rate limit for `listFiles`; exact CDN 404 timing after delete; list filter by file router; thumbnail field on list.
