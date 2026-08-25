Type: research
Status: resolved

## Question

For **Next.js 16** App Router (this app is `next` 16.2.4), what is the supported way to gate `/admin` with a server-checked env password and an httpOnly cookie — no user database?

Need from Next.js (and, if relevant, Web platform) primary docs:

- Middleware vs layout vs route handler vs Server Action for checking the cookie and rejecting unauthenticated requests (including RSC and route handlers under `/admin`).
- Setting/clearing an httpOnly cookie from a POST (gate submit / logout): `cookies()`, `Set-Cookie` rules, `Secure`, `SameSite`, `Path`, `Max-Age`.
- Comparing the submitted password to `ADMIN_PASSWORD` (timing-safe compare; never logging the secret).
- Redirects vs 401 for the gate form vs APIs that perform removal.
- Anything that changed or is deprecated in Next 16 relative to older middleware cookie examples.

Cite each claim back to Next.js docs or the Fetch/cookie specs they point to.

## Answer

Full notes: [Next.js 16 password gate](../research/02-next-password-gate.md). Research by [Next.js password-gate research](449044cc-6c52-49f2-83a0-8ef06731217c).

Gate with a Server Action (or POST Route Handler): compare `ADMIN_PASSWORD` on the server with Node `crypto.timingSafeEqual`, then `cookies().set` an **httpOnly session cookie** — signed/encrypted payload plus a separate `SESSION_SECRET`, not the password itself (`SameSite=lax`, `Path=/`, ~7-day max-age, `Secure` on HTTPS).

In Next 16, check cookies in optional **`proxy.ts`** (middleware renamed); **layouts are not a security boundary**. Re-verify in a DAL / page, every Server Action, and every `/admin` Route Handler. Cookie writes only in Actions or Route Handlers, not while rendering RSC.

HTML gate: `redirect` (303 from Actions). Removal APIs: **401**. Failed password: Action error state, not 401 HTML. Do not use experimental `unauthorized()` unless opting into `authInterrupts`.

## Comments

Resolved from research file above. Ticket [Draft the spec](03-draft-spec.md) still waits on [UploadThing list and delete APIs](01-uploadthing-list-delete.md).
