Type: task
Status: resolved
Blocked by: 01, 02, 03, 05

## Question

Write the destination spec at `.scratch/admin-gallery-download/spec.md`.

Use the map Notes (standing choices) plus the answers on [UploadThing original bytes](01-uploadthing-original-bytes.md), [Next.js archive response](02-next-archive-response.md), and [Host limits for archives](03-host-limits-for-archives.md). The spec must be enough to add the archive control to the existing `/admin` gallery. Do not implement the app. Do not rewrite the gate, listing, or removal specs.

## Answer

Spec written: [admin gallery archive](../spec.md).

«Изтегли всички» on the existing gallery; GET `/admin/archive` streams one zip of every `Uploaded` photo on Vercel Functions. Implementation is a later session — this ticket only produced the spec.

## Comments

Map destination reached. No further tickets. Host posture is [Host posture for the archive](05-host-posture-for-the-archive.md).
