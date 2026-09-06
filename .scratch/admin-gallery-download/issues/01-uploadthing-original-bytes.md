Type: research
Status: resolved

## Question

For UploadThing **v7** (`uploadthing` ^7.7.4) as this app uses it (`UTApi`, public `ufs.sh` URLs from `key`, `listFiles` / `deleteFiles` already chosen), what is the official way to obtain **original bytes** for every uploaded photo so the server can pack an archive?

Need from UploadThing primary docs and this package’s types/source:

- Is there a first-party zip, export, or bulk-download API? If yes: auth, limits, what it contains.
- If not: how should a server fetch each original (`ufs.sh` GET, `generateSignedURL`, `UTApi` download helper)? Public vs private ACL for this app.
- Pagination when collecting the full set (`listFiles` limit/offset/hasMore; max limit).
- Rate limits, timeouts, and failure modes when fetching many files.
- Whether list metadata is enough (name, key, size, status) or another call is required per file.

Cite each claim back to UploadThing’s own docs or source.

## Answer

No first-party zip, export, or bulk-download. OpenAPI 6.10.0 and `UTApi` 7.7.4 only list/manage files and mint URLs. Originals are CDN objects: GET `https://<APP_ID>.ufs.sh/f/<FILE_KEY>` (this app’s default public ACL — unsigned, same URL the gallery already builds). Private files need `generateSignedURL` then GET; there is no `UTApi` method that returns bytes. Walk `listFiles` (`limit` default 500, max 100000, `offset`, `hasMore`); list `name` / `key` / `size` / `status` is enough. No published CDN QPS or timeout.

Details: [research/01-uploadthing-original-bytes.md](../research/01-uploadthing-original-bytes.md)

## Comments

2026-09-06: Resolved from docs.uploadthing.com (working-with-files, UTApi, regions-acl, file-routes), api.uploadthing.com OpenAPI 6.10.0, and `uploadthing@7.7.4` types/source. Reused list pagination facts from admin-gallery research where they still match the installed package.
