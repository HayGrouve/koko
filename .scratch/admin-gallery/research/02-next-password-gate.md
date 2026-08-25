# Research: Next.js 16 password gate (`/admin`, env secret, httpOnly cookie)

**Question:** For Next.js 16 App Router (`next` 16.2.4 in this repo), what is the supported way to gate `/admin` with a server-checked env password and an httpOnly cookie, with no user database?

**Sources:** Installed package docs at `node_modules/next/dist/docs/` (Next.js **16.2.4**). Cross-checked Context7 `/vercel/next.js/v16.2.9` (closest tagged tree; same guides). Cookie semantics from MDN. Timing-safe compare from Node.js `crypto` (Next.js does not document password comparison).

**Not in Next.js primary docs:** comparing a submitted password to `ADMIN_PASSWORD` with a timing-safe primitive, and a prohibition on logging that secret. Those claims are from Node.js / env-bundling docs only.

---

## Supported pattern (stateless session, not “password in cookie”)

Next.js documents **authentication** (prove identity), **session management**, then **authorization** (what routes/data are allowed). The App Router login path is a `<form>` plus a **Server Action** so credentials never run in the client module. Server Actions “always execute on the server.” ([`01-app/02-guides/authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Authentication / Sign-up and login)

For a gate with **no user table**, the matching session model is **stateless sessions**: session data (or a token) lives in a browser cookie, sent on each request, verified on the server. Next.js still recommends signing/encrypting that cookie (example: generate `SESSION_SECRET`, encrypt with Jose, store **minimum** payload — not passwords). ([same file](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Session Management / Stateless Sessions, including the tip that the JWT payload must not contain passwords)

**Implication for this ticket:** compare `ADMIN_PASSWORD` only at login (Server Action or Route Handler). After that, set an **httpOnly session cookie** (signed token or equivalent), not the password itself. Storing the raw password as the cookie value is not what the authentication guide shows.

`ADMIN_PASSWORD` must **not** be named `NEXT_PUBLIC_*`. Non-prefixed env vars stay on the Node server; `NEXT_PUBLIC_` is inlined into the client bundle. Server Components “can safely access environment variables, secrets.” ([`environment-variables.md`](../../../node_modules/next/dist/docs/01-app/02-guides/environment-variables.md) — Bundling Environment Variables for the Browser; [`data-security.md`](../../../node_modules/next/dist/docs/01-app/02-guides/data-security.md) — Server vs Client Components)

Mark session helpers with `import 'server-only'` as in the official session example. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Encrypting and decrypting sessions)

---

## Where to check the cookie: Proxy vs layout vs Route Handler vs Server Action

| Layer | What Next 16.2.4 actually says | Fit for `/admin` |
| --- | --- | --- |
| **Proxy** (`proxy.ts`, formerly Middleware) | Runs **before** routes render. Can rewrite, redirect, change headers, or **respond directly**. Useful for **optimistic** cookie checks and centralized redirects; **not** a full session/authorization solution. Avoid slow fetches / DB. ([`01-getting-started/16-proxy.md`](../../../node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md); [`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Optimistic checks with Proxy) | Optional first filter: redirect HTML navigations to the gate if cookie missing. **Must not** be the only check. |
| **Layout** | Can `await cookies()` (no raw `Request`). **Do not** treat layout as the security boundary: Partial Rendering means layouts **do not re-render on every navigation**, so session is not re-checked on each client transition. Returning `null` in a layout does **not** stop nested segments or Server Actions. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Layouts and auth checks; [`layout.md` via Context7 / file convention](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md) for `cookies()` in layouts) | Fetch/display only. Put real checks in a DAL / page / mutation. |
| **Server Component page / DAL** | Official `verifySession()` reads `cookies()`, decrypts, then `redirect('/login')` if missing. Invoke from data loaders, pages, **Server Actions**, **Route Handlers**. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Creating a Data Access Layer) | **Required** for RSC under `/admin`. |
| **Server Action** | Treat like a public POST endpoint. Page-level auth **does not** cover actions defined on that page. Re-verify inside every action. Proxy matchers that **exclude** a path also skip Server Function POSTs to that path. ([`data-security.md`](../../../node_modules/next/dist/docs/01-app/02-guides/data-security.md) — Authentication and authorization; [`proxy.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md) — Execution order / Server Functions) | Login, logout, and any remove mutation. |
| **Route Handler** | Public HTTP endpoints. Same security as APIs: verify session, then `401` / `403`. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Route Handlers; [`backend-for-frontend.md`](../../../node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md) — Public Endpoints) | Removal APIs / JSON under `/admin`. |

**RSC vs APIs:** Proxy can see both page requests and Route Handlers if `matcher` includes them. The stock auth Proxy example **excludes** `api` in its matcher (`/((?!api|_next/static|_next/image|.*\\.png$).*)`), so **API routes would not get that check**. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) Proxy `config.matcher`) For `/admin/*` Route Handlers, matcher must include those paths (e.g. `'/admin/:path*'`), or rely entirely on handler-level `verifySession`.

**Reading the cookie in Proxy:** `request.cookies.get('session')` **or** `(await cookies()).get('session')`. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) Tips under Optimistic checks)

**Proxy is not Edge-only in 16:** “Proxy defaults to using the Node.js runtime.” Setting `runtime` in the Proxy file throws. ([`proxy.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md) — Runtime). The same page’s “Why Proxy” paragraph still *describes* historical Edge default; version history: Node runtime stable in **15.5**, rename in **16.0**. Prefer the Runtime section for 16.2.4.

---

## Next 16 deprecations vs older `middleware` cookie examples

- File convention **`middleware` is deprecated and renamed to `proxy`**. Codemod: `npx @next/codemod@canary middleware-to-proxy .` (renames file and `middleware` → `proxy`). ([`proxy.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md) — Migration to Proxy; Version history `v16.0.0`)
- Getting-started: “Starting with Next.js 16, Middleware is now called Proxy to better reflect its purpose. The functionality remains the same.” ([`16-proxy.md`](../../../node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md))
- Cookie APIs on the request/response are the same shape: `request.cookies` / `response.cookies.set` still emit `Set-Cookie`. ([`proxy.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md) — Using Cookies)
- Flags renamed: `skipProxyUrlNormalize` (formerly `skipMiddlewareUrlNormalize`). ([`proxy.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md) — Advanced Proxy flags)
- Auth guide still links **v15** Middleware docs only as a fallback if a library is Edge-only. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) Proxy tips)
- `cookies()` from `next/headers` is **async** (since 15 RC). Sync access is leftover compatibility, to be deprecated. **`.set` / `.delete` are not allowed while a Server Component is rendering** (streaming / no `Set-Cookie` after stream starts). ([`cookies.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md) — Good to know, Understanding Cookie Behavior)

Older blog posts that export `middleware` from `middleware.ts` are the pre-16 name. Use `proxy.ts` + `export function proxy` (or default export).

---

## Setting and clearing httpOnly cookies from POST

**Where writes are allowed:** `cookies()` from `next/headers` **reads** in Server Components; **reads and writes** in Server Functions (Actions) and Route Handlers. ([`cookies.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md) intro)

**Login (set):** after verifying credentials, `cookieStore.set('session', token, { httpOnly, secure, expires | maxAge, sameSite, path })`. Auth guide recommended options (and points to MDN):

- **HttpOnly** — no `document.cookie`
- **Secure** — HTTPS
- **SameSite** — cross-site sending
- **Max-Age or Expires**
- **Path**

Example uses `httpOnly: true`, `secure: true`, `sameSite: 'lax'`, `path: '/'`, `expires` ~7 days. Then `redirect('/profile')` from the Server Action. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Setting cookies)

`cookies()` option names: `maxAge` (seconds), `expires` (Date), `path` default `'/'`, `secure`, `httpOnly`, `sameSite`: `'lax' | 'strict' | 'none'`. ([`cookies.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md) — Options)

Route Handlers can also `NextResponse.redirect(...); response.cookies.set({ name, value, path, secure, httpOnly, expires })`. ([`backend-for-frontend.md`](../../../node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md) — Callback URLs)

**Logout (clear):** `cookieStore.delete('session')` in a Server Action, then `redirect('/login')`. Equivalents: set empty value, or `maxAge: 0`. `.delete` only in Server Function or Route Handler, same domain/protocol. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Deleting the session; [`cookies.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md) — Deleting cookies)

### MDN `Set-Cookie` (what those flags mean on the wire)

Canonical: [Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) (also [Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)). Next.js `cookies` and auth pages still link the older path `https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies`.

- **HttpOnly:** forbids JS access via `Document.cookie`; still sent on `fetch`/`XHR`. XSS mitigation. ([MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie))
- **Secure:** sent only on `https:` (exception: localhost). `http:` sites cannot set `Secure`. ([same](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie))
- **SameSite:** `Strict` / `Lax` / `None`. `None` **requires** `Secure`. `Lax` omits cookie on cross-site **unsafe** methods (POST/PUT/DELETE). For a same-origin admin form POST this is same-site. ([same](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie); session guidance: [Session management](https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Session_management) — HttpOnly + Secure + SameSite Lax/Strict)
- **Path:** URL prefix for sending `Cookie`. Default if omitted is the request path (not `/`). Next.js `cookies().set` defaults `path` to `'/'`. Path is **not** a security boundary. ([MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie); [`cookies.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md))
- **Max-Age:** seconds until expiry; `0` or negative expires immediately; **Max-Age wins over Expires**. ([MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie))
- **Set-Cookie** is a **forbidden response header** for frontend JS (Fetch). The browser stores it; scripts cannot read the header. ([MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie))

Ticket standing choice (`SameSite=Lax`, `Secure` in production, ~7-day max-age) matches the Next.js session example (`sameSite: 'lax'`, `secure: true`, week-long `expires`). Use `secure: process.env.NODE_ENV === 'production'` only appears in the **Pages** API `serialize` example, not the App Router `cookies().set` snippet. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) Pages “Setting and deleting cookies”)

---

## Comparing submitted password to `ADMIN_PASSWORD`

Next.js shows **Zod** (or similar) for form shape, then “check user credentials” against a provider/DB. It does **not** specify constant-time string compare. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Validate form fields; Create a user or check user credentials)

**Timing-safe compare (Node, primary for this repo’s runtime):** [`crypto.timingSafeEqual(a, b)`](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b) compares underlying bytes in constant time. Documented as suitable for “secret values like authentication cookies.” **Both inputs must be the same byte length** or it **throws**. Surrounding code can still leak timing (e.g. early `return` on length mismatch).

**Never log the secret:** Next.js session `decrypt` logs only `'Failed to verify session'`, not the cookie or key. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) `decrypt` catch). Env docs never print `DB_PASS`. Data-security: do not pass secret tokens as public fields; `NEXT_PUBLIC_` would ship the password. ([`data-security.md`](../../../node_modules/next/dist/docs/01-app/02-guides/data-security.md))

Do not put the password in the URL (`searchParams` as admin flag is explicitly “BAD”). ([`data-security.md`](../../../node_modules/next/dist/docs/01-app/02-guides/data-security.md) — Validating client input)

---

## Redirects vs 401

**Browser gate / RSC (show login, then continue):**

- Auth DAL example: `redirect('/login')` when session missing. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) `verifySession`)
- After successful login Action: `redirect` to the protected page. In a Server Action, `redirect` is a **303**. Otherwise **307**. ([`redirect.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md); table in [`redirecting.md`](../../../node_modules/next/dist/docs/01-app/02-guides/redirecting.md))
- Proxy: `NextResponse.redirect` for unauthenticated **page** visits (auth example). Status “Any” in the redirecting table. ([`redirecting.md`](../../../node_modules/next/dist/docs/01-app/02-guides/redirecting.md); [`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md))
- **303** after POST: browser follows with GET (PRG). ([MDN 303](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303))

**JSON / removal APIs:**

- Route Handler example: no session → `new Response(null, { status: 401 })`; wrong role → **403**. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Route Handlers)
- Proxy on `/api/*`: `Response.json(..., { status: 401 })`. ([`backend-for-frontend.md`](../../../node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md) — Proxy)
- Webhook token mismatch: `NextResponse.json({ success: false }, { status: 401 })`. ([same file](../../../node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md))
- HTTP **401** = missing/invalid **authentication** credentials. **403** = authenticated but not allowed. ([MDN 401](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401))

**Experimental 401 UI:** `unauthorized()` from `next/navigation` needs `experimental.authInterrupts`. Renders `unauthorized.js` and returns **401**. Marked experimental in 16.2.4 docs (`version: experimental` / `authInterrupts` “canary”). Cannot call from the **root** layout. ([`unauthorized.md` function](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unauthorized.md); [`unauthorized.js` file](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/unauthorized.md); [`authInterrupts.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/authInterrupts.md))

**Stable recommendation for this app:** use **`redirect`** (or Proxy redirect) for the HTML gate; use **`401`** on Route Handlers that delete photos. Do not depend on experimental `unauthorized()` unless you opt into `authInterrupts`.

Failed **password** submit: return Action state (generic error), not a 401 HTML page — auth forms use `useActionState` + returned `message`, not HTTP 401. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) signup validation returns)

---

## Concrete assembly (docs-shaped, not an implementation)

1. **`ADMIN_PASSWORD`** in `.env` (gitignored). Server-only. Compare on POST in a Server Action (or POST Route Handler).
2. **Set session cookie** with `cookies().set` in that POST (`httpOnly`, `sameSite: 'lax'`, `path: '/'`, `maxAge` ~7 days, `secure` on HTTPS). Prefer encrypted/signed cookie + separate `SESSION_SECRET`, per the guide — not the password bytes.
3. **Optional `proxy.ts`** matcher `/admin/:path*`: if no valid cookie, `NextResponse.redirect` to the gate (and **do not** exclude the admin APIs). Still re-check in DAL / Actions / handlers.
4. **RSC `/admin`:** `verifySession()` → `redirect` to gate form.
5. **Logout Action:** `cookies().delete` + `redirect`.
6. **Remove APIs:** `verifySession`; if missing, `401` (and `403` only if you add roles later).

---

## Source index

| Claim area | Primary |
| --- | --- |
| App Router auth + sessions + Proxy vs DAL vs layouts vs Actions vs Route Handlers | `node_modules/next/dist/docs/01-app/02-guides/authentication.md` |
| Data security / re-verify Actions / no `NEXT_PUBLIC_` secrets | `.../01-app/02-guides/data-security.md` |
| `cookies()` read/write, async, options | `.../01-app/03-api-reference/04-functions/cookies.md` |
| Proxy rename, cookies on request/response, matchers, Server Functions | `.../01-app/03-api-reference/03-file-conventions/proxy.md`, `.../01-app/01-getting-started/16-proxy.md` |
| 401 from Proxy / Route Handler cookies | `.../01-app/02-guides/backend-for-frontend.md` |
| `redirect` 307/303 | `.../01-app/03-api-reference/04-functions/redirect.md`, `.../01-app/02-guides/redirecting.md` |
| Experimental `unauthorized` | `.../04-functions/unauthorized.md`, `.../03-file-conventions/unauthorized.md` |
| Env server vs client | `.../01-app/02-guides/environment-variables.md` |
| Cookie attributes | [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) |
| Timing-safe compare | [Node `crypto.timingSafeEqual`](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b) |
| HTTP 401 / 303 | [MDN 401](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401), [MDN 303](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/303) |
