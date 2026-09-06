Type: grilling
Status: resolved

## Question

[Host limits for archives](03-host-limits-for-archives.md) says a **buffered** zip on Vercel Functions is not viable (4.5 MB), and a **single streamed “every uploaded photo” zip** on default Hobby/Pro serverless is not a reliable product path (duration, 2 GB RAM, 500 MB `/tmp`) when originals can be 256 MB.

Which host posture should the spec **require**?

First-party escapes named in that research: stream (already standing); split into smaller archives; raise Fluid / `maxDuration` / Pro RAM; don’t proxy media; Vercel Workflows; or `next start` / Docker.

The spec needs one locked path so an implementer is not guessing. This is not “stream vs buffer” — stream is already decided.

## Answer

Stay on **Vercel Functions**. Do not require Docker / `next start`, Workflows, or several smaller archives.

- **GET** Route Handler at **`/admin/archive`** (`app/admin/archive/route.ts` — not beside `page.tsx`). Session cookie is already `SameSite=Lax`.
- **`runtime: 'nodejs'`**. `export const maxDuration` = Fluid maximum for the deploy plan (Hobby **300**; Pro **800** unless they already opted into the 1800 beta). Turn Fluid on if the project predates 23 Apr 2025 and still has the 10s/60s clock.
- Stream each original (`fetch` the public `ufs.sh` URL) **into** the zip stream. Never `arrayBuffer()` a whole original, never assemble the finished zip in memory, never write the archive to `/tmp`.
- Timeout (**504**), OOM, or a failed fetch: fail the whole request; UI **«Не успяхме да съберем снимките.»**
- No server-side single-flight lock. The gallery button already disables while packing.
- Do not raise Hobby RAM in the spec (it cannot). Do not require a Pro plan.

## Comments

2026-09-06: All remaining branches took the recommended options (Vercel Functions + stream + plan-max `maxDuration` + fail on 504/OOM; GET `/admin/archive`; no split/Workflows/self-host).
