Type: task
Status: resolved
Blocked by: 01, 02

## Question

Write the destination spec at `.scratch/admin-gallery/spec.md`.

Use the map Notes (standing choices) plus the answers on [UploadThing list and delete APIs](01-uploadthing-list-delete.md) and [Next.js password gate](02-next-password-gate.md). The spec must be enough to implement `/admin`: gate, list uploaded photos, remove one photo behind in-app confirmation. Do not implement the app.

## Answer

Spec written: [password-gated admin gallery](../spec.md).

`/admin` gate (env `ADMIN_PASSWORD` + signed cookie via `SESSION_SECRET`), `UTApi.listFiles` / `deleteFiles`, in-app confirmation, Bulgarian copy, no app database. Implementation is a later session — this ticket only produced the spec.

## Comments

Map destination reached. No further tickets. Gate lockout stays out of this spec.
