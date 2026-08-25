## Destination

A spec at `.scratch/admin-gallery/spec.md` that an implementer can follow: a password-gated admin gallery (password from env), listing uploaded photos, with removal behind an in-app confirmation. This map does not build the gallery.

**Reached** — see [password-gated admin gallery](spec.md).

## Notes

Domain: wedding guest uploads (Bulgarian public site today; UploadThing stores the photos). Consult `CONTEXT.md`, `/grilling`, `/domain-modeling`. Last ticket writes the spec — that *is* the destination.

Standing choices (all recommended options, accepted 2026-08-25):

- Route `/admin`, not linked from the public header.
- Env var `ADMIN_PASSWORD`. Compare on the server; never put the password in the URL.
- Gate: password form → httpOnly cookie (`SameSite=Lax`, `Secure` in production, ~7-day max-age). No user database. Generic failure copy. Include a logout control.
- List and remove via UploadThing server APIs; do not add an app database for this effort.
- One uploaded photo removed at a time. Confirmation is an in-app dialog that shows the photo, with explicit confirm and cancel — not `window.confirm`.
- Bulgarian copy; reuse the existing wedding typography, header, and surfaces.
- Show a thumbnail plus name, uploaded time, and size from `listFiles`. Build the image URL as `https://<APP_ID>.ufs.sh/f/<FILE_KEY>` (list does not return URLs).
- Page with `limit` / `offset` / `hasMore`; admin grid first page of 50, load-more while `hasMore`. Do not persist upload keys locally.

## Decisions so far

- [Next.js password gate](issues/02-next-password-gate.md) — Server Action sets a signed httpOnly session cookie (`SESSION_SECRET`); `proxy.ts` is optional; layouts are not a gate; redirect HTML, 401 on removal APIs. Details: [research](research/02-next-password-gate.md).
- [UploadThing list and delete APIs](issues/01-uploadthing-list-delete.md) — Server `UTApi.listFiles` / `deleteFiles` with `UPLOADTHING_TOKEN`; app-wide list (no local keys); delete by `key`. Details: [research](research/01-uploadthing-list-delete.md).
- [Draft the spec](issues/03-draft-spec.md) — Spec is [password-gated admin gallery](spec.md).

## Not yet specified

<!-- none — destination spec is written; lockout was ruled out of this spec -->

## Out of scope

- A public gallery for guests.
- User accounts, OAuth, 2FA.
- Bulk removal, zip/download/export, rename, captions, or attaching guest names (the uploader does not store them).
- Gate lockout / rate-limiting on failed passwords (generic error only).
