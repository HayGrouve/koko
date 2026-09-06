## Destination

A spec at `.scratch/admin-gallery-download/spec.md` that an implementer can follow: a control on the existing admin gallery that starts a **server-built archive** of every uploaded photo. This map does not build the button.

**Reached** — see [admin gallery archive](spec.md).

## Notes

Domain: wedding guest uploads (Bulgarian public site; UploadThing stores the photos; `/admin` already lists and removes). Consult `CONTEXT.md`, `/grilling`, `/domain-modeling`. Last ticket writes the spec — that *is* the destination.

The earlier [password-gated admin gallery](../admin-gallery/map.md) map ruled zip/download out of scope. This effort specifies only the archive control. Do not rewrite the gate, listing, or removal.

Standing choices (all recommended options, accepted 2026-09-06):

- One `.zip` **archive** of every uploaded photo (`status === "Uploaded"`), not a burst of per-photo browser saves, not only the 50 tiles on screen.
- The **server** walks every `listFiles` page, fetches originals, and streams the archive. Same gallery session as listing and removal; re-verify in the handler. No app database.
- Entry names: stored UploadThing `name`. First clash keeps the name; later ones suffix a short piece of `key` (e.g. `IMG_1234-a1b2c3.jpg`).
- Control: primary pill on the gallery, above the grid. Copy **«Изтегли всички»**. Hide when the empty gallery is showing. Disable while packing. No confirmation.
- Save-as name: `snimki-ot-gostite-YYYY-MM-DD.zip` (date of the request, ISO calendar date).
- One photo fetch failure: fail the whole request; no partial archive. Error **«Не успяхме да съберем снимките.»**
- No progress percent. Unauthorized archive request: **401** (same idea as removal APIs).
- Host: **Vercel Functions**, Node runtime. GET `/admin/archive`. Stream each original into the zip; no full-file `arrayBuffer()`, no `/tmp` archive. `maxDuration` = Fluid max for the plan (Hobby 300 / Pro 800). Fluid on if the project still has the old 10s/60s clock. 504/OOM uses the same failure copy. No Docker, Workflows, split archives, or required Pro plan.

## Decisions so far

- [UploadThing original bytes](issues/01-uploadthing-original-bytes.md) — No UT zip/export API; page `listFiles`, GET each public `ufs.sh` URL. Details: [research](research/01-uploadthing-original-bytes.md).
- [Next.js archive response](issues/02-next-archive-response.md) — Stream the zip from a Route Handler (`new Response`); Server Actions cannot attach a file. `verifySession()` in the handler, 401 if missing. Details: [research](research/02-next-archive-response.md).
- [Host limits for archives](issues/03-host-limits-for-archives.md) — Buffered zip dies at Vercel’s 4.5 MB payload; streamed zip still faces 300s / 2 GB / 500 MB `/tmp`. One invocation is not reliable for 256 MB originals. Details: [research](research/03-host-limits-for-archives.md).
- [Host posture for the archive](issues/05-host-posture-for-the-archive.md) — Vercel Functions; GET `/admin/archive`; stream into the zip; plan-max `maxDuration`; fail on 504/OOM; no split/self-host/Workflows.
- [Draft the archive spec](issues/04-draft-the-archive-spec.md) — Spec is [admin gallery archive](spec.md).

## Not yet specified

<!-- none — destination spec is written -->

## Out of scope

- Building the button or any app code in this map.
- Per-photo download, email, Drive, WeTransfer, or other off-site handoff.
- Changing the public uploader (`/`, `/success`).
- App database / persisting keys on upload.
- Bulk removal, rename, captions, guest names.
- Progress bar, confirmation dialog, English admin jargon (Export, Dashboard, Download all).
