Type: research
Status: resolved

## Question

For UploadThing **v7** (`uploadthing` ^7.7.4, `@uploadthing/react` ^7.3.3) as used by this app’s `imageUploader` router, what official server APIs list and delete files?

Need from primary docs (and this repo’s `app/api/uploadthing` usage if it constrains the answer):

- The exact APIs, identifiers (key, url, customId), and required auth (secret env).
- List metadata actually returned (name, size, uploadedAt, thumbnail/url).
- Pagination, filters (e.g. by app/router), and limits.
- Delete: one vs many, what happens to the URL after delete, error cases.
- Whether listing the app’s uploaded photos requires persisting keys on upload, or UTApi can list the whole app.

Cite each claim back to UploadThing’s own docs or source.

## Answer

Full notes: [UploadThing list and delete APIs](../research/01-uploadthing-list-delete.md). Research by [UTApi list/delete research](2c6ecdce-6227-422f-a80b-0c172f7a8e99).

Server-only `UTApi` from `uploadthing/server`: `listFiles` and `deleteFiles` (`POST /v6/listFiles` and `/v6/deleteFiles`). Auth is **`UPLOADTHING_TOKEN`** (v7 replaced `UPLOADTHING_SECRET`). The `imageUploader` slug is not a list filter.

Listing is **app-wide** and does **not** require persisting keys on upload. Pagination: `limit` (default 500, max 100000) / `offset` / `hasMore`. Fields: `name`, `size`, `key`, `customId`, `status`, `uploadedAt` (ms). No URL or thumbnail — build `https://<APP_ID>.ufs.sh/f/<FILE_KEY>`.

Delete takes one key or an array (`fileKey` or `customId`); returns `{ success, deletedCount }`. Objects are marked for deletion and dropped from storage shortly after.

## Comments

Resolved from research file above. Persistence fog is cleared: do not add a local key store for listing.
