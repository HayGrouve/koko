# Research: Next.js 16 session-gated archive download

**Question:** For Next.js 16 App Router (`next` 16.2.4 in this repo), what is the supported way to send a **session-gated `.zip` archive** to the browser as a file download?

**Sources:** Installed package docs at `node_modules/next/dist/docs/` (Next.js **16.2.4**). Cross-checked Context7 `/vercel/next.js/v16.2.9` (closest tagged tree). The download + stream examples match the installed `streaming.md` — no drift on the claims below. Cookie / `Content-Disposition` / MIME / 401 from MDN (the specs Next.js links).

**Not in Next.js primary docs:** how to *build* a zip (no first-party archive API). Host time/memory/response-size caps are ticketed separately (`issues/03-host-limits-for-archives.md`). This note only covers the HTTP response shape.

**Existing session in this app:** `verifySession()` in `lib/admin-dal.ts` reads the httpOnly cookie via `cookies()` and validates it with `SESSION_SECRET`. `/admin` RSC and every gallery Server Action already call it. There is no `proxy.ts`. Prior gate research: [`.scratch/admin-gallery/research/02-next-password-gate.md`](../../admin-gallery/research/02-next-password-gate.md). Spec: [`.scratch/admin-gallery/spec.md`](../../admin-gallery/spec.md).

---

## Supported pattern: Route Handler + `Response` + stream

Send the archive from a **Route Handler** (`route.ts`), not a Server Action.

Route Handlers are custom HTTP endpoints using the Web [`Request`](https://developer.mozilla.org/docs/Web/API/Request) / [`Response`](https://developer.mozilla.org/docs/Web/API/Response) APIs. They can return **any content type**, including **files**. They do **not** participate in layouts or client navigations the way `page` does. ([`15-route-handlers.md`](../../../node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md); [`backend-for-frontend.md`](../../../node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md) — Public Endpoints / Content types)

They **cannot** live at the same segment as `page.js`. `app/admin/page.tsx` already exists, so the download must be a **sibling path** (e.g. `app/admin/archive/route.ts` → `/admin/archive`). Same-segment `route` + `page` is a conflict. ([`15-route-handlers.md`](../../../node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md) — Route Resolution)

The installed streaming guide’s download example is the first-party file-attachment pattern:

```ts
return new Response(file.readableWebStream(), {
  headers: {
    'Content-Type': 'text/csv',
    'Content-Disposition': 'attachment; filename="data.csv"',
  },
})
```

([`streaming.md`](../../../node_modules/next/dist/docs/01-app/02-guides/streaming.md) — Streaming in Route Handlers)

For a generated zip, the same primitive applies: `return new Response(stream, { headers })` where `stream` is a Web [`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream). The Route Handler API also shows `new Response(stream)` from an async iterator. ([`route.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md) — Streaming)

`NextResponse` is still valid: it extends Web `Response`; you can return it wherever a `Response` is expected. Helpers are `json()`, `redirect()`, `rewrite()`, `next()`, plus `cookies`. There is **no** download-specific helper. The file examples use native `new Response(...)`. ([`next-response.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-response.md); [`backend-for-frontend.md`](../../../node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md) — NextRequest and NextResponse)

Default runtime is **`'nodejs'`**. Zip generation that needs Node APIs should stay on Node, not `edge`. ([`runtime.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md))

---

## Server Actions cannot stream a zip as an attachment

Server Functions / Actions exist to **mutate** data from the client. They run as `POST` only. Next.js can return **updated UI and new data** in one roundtrip — not a raw file body. ([`07-mutating-data.md`](../../../node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md); [`backend-for-frontend.md`](../../../node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md) — Server Actions)

**Return values are serialized** and sent to the client. Docs tell you to return DTOs / `{ success: true }`, not raw records — and never mention `Response`, streams, or `Content-Disposition`. ([`use-server.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md) — Return values; [`data-security.md`](../../../node_modules/next/dist/docs/01-app/02-guides/data-security.md) — Controlling return values)

Proxy docs warn that setting response `Content-Type` via `NextResponse.next({ headers })` can **override the Content-Type used by Server Actions** and break streaming of those responses. That is the framework’s own wire format, not `application/zip`. ([`next-response.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-response.md) — `next()`)

**Implication:** a Server Action cannot be the HTTP endpoint that streams `Content-Disposition: attachment`. Use a Route Handler. An Action may still *start* a download only by pointing the browser at that URL (or `redirect` to it); the bytes must come from `route.ts`.

This matches the existing admin spec: HTML mutations (gate, logout, load-more, remove) are Actions; a Route Handler is the place that answers **401**. ([`admin-gallery/spec.md`](../../admin-gallery/spec.md) — Removal)

---

## Streaming the body vs buffering the archive

| Approach | What the docs show | Memory |
| --- | --- | --- |
| `new Response(readableStream)` | Route Handler streaming + download examples | Chunks leave as produced. Official reason to use `FileHandle.readableWebStream()`: stream files **without loading them entirely into memory**. Same idea for a generated zip: enqueue zip chunks; do not `await` a full `Buffer` then pass it as the body. ([`streaming.md`](../../../node_modules/next/dist/docs/01-app/02-guides/streaming.md)) |
| `new Response(uint8Array \| string)` | RSS / XML / JSON examples | The whole payload is in memory before the response starts. Fine for small text; not the documented large-file path. ([`route.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md) — Non-UI Responses) |

Streaming can still be **buffered by infrastructure**: some CDNs hold the full response; not all serverless hosts stream by default (AWS Lambda needs response-streaming mode); **Vercel streams natively**; gzip/brotli can delay the first chunk; Safari buffers ~1024 bytes (irrelevant for a zip). Self-hosted reverse proxies must disable response buffering. ([`streaming.md`](../../../node_modules/next/dist/docs/01-app/02-guides/streaming.md) — CDNs / Serverless / Compression / Clients; self-hosting link from the same guide)

`maxDuration` sets seconds of server-side work on `route.ts` (and on Actions, via the **page** that uses them). Platform default applies if unset. Long-running handlers “may be terminated due to timeouts.” Numbers and Vercel plan caps belong to the host-limits ticket. ([`maxDuration.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md); [`backend-for-frontend.md`](../../../node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md) — Deployment environment)

Once headers are sent with a streaming body, you cannot turn a late pack error into a clean JSON 500. Standing choice (fail the whole request, no partial archive) has to happen **before** the `200` + attachment headers, or by aborting the stream (client sees a truncated download). Next.js does not document a mid-stream status change.

---

## Re-verify the admin session inside the handler; **401** if missing

Route Handlers are **public HTTP endpoints**. “Any client can access them.” Restrict access with authentication. ([`backend-for-frontend.md`](../../../node_modules/next/dist/docs/01-app/02-guides/backend-for-frontend.md) — Public Endpoints)

Official pattern: call `verifySession()` from the DAL **inside** the handler. No session → `return new Response(null, { status: 401 })`. Wrong role → **403**. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Route Handlers; Creating a Data Access Layer: invoke `verifySession()` in data requests, Server Actions, **Route Handlers**)

HTTP **401** = missing/invalid authentication. **403** = authenticated but not allowed. ([MDN 401](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401))

This app has **no roles**. `verifySession()` returns `boolean`. Missing/invalid cookie → **401**, not 403. Same standing choice as the download map and the removal-API branch of the gallery spec.

**The `/admin` page check does not cover this route.** Layouts are not a security boundary (Partial Rendering). Page-level auth does not cover Actions; Route Handlers are a separate public URL. There is no `proxy.ts` today; even if one is added later, Proxy is only an **optimistic** filter — still re-check in the handler. ([`authentication.md`](../../../node_modules/next/dist/docs/01-app/02-guides/authentication.md) — Layouts and auth checks; Optimistic checks with Proxy; [`data-security.md`](../../../node_modules/next/dist/docs/01-app/02-guides/data-security.md) — Authentication and authorization)

Read the cookie the same way as listing/removal: `await cookies()` from `next/headers` (async since 15). Route Handlers may also use `request.cookies.get(...)`. `cookies()` **reads** here; do not write session cookies while streaming the zip. ([`cookies.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md); [`route.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md) — Cookies)

The existing cookie is **HttpOnly**. The browser still **sends** it on same-origin `fetch` / navigation; scripts cannot read it. `SameSite=Lax` (this app) is sent on top-level same-site GET and same-site POST. ([MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie); prior gate research)

**Do not cache the GET.** Handlers are dynamic by default (change in **15.0 RC**: GET default went from static to dynamic). `cookies()` / `request.cookies` are runtime APIs — prerendering stops. Never `export const dynamic = 'force-static'` on a gated archive. ([`15-route-handlers.md`](../../../node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md) — Caching / Cache Components; [`route.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md) Version History)

GET vs POST: the official attachment example is **GET**. POST is also a supported method if the UI prefers it. Either way, verify session first, then stream or 401.

---

## Headers

### `Content-Type`

Set it on the `Response`, same as the CSV download and RSS examples. For `.zip`, MDN’s common types table: **`application/zip`**. Windows sometimes uploads as `application/x-zip-compressed`; the registered type is `application/zip`. `application/octet-stream` is the generic unknown-binary default — usable, but less specific. ([`streaming.md`](../../../node_modules/next/dist/docs/01-app/02-guides/streaming.md); [MDN common MIME types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types))

### `Content-Disposition`

Response value `attachment` means “download; Save As,” prefilled from `filename` when present. ([MDN Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition); RFC 6266)

Standing filename is ASCII: `snimki-ot-gostite-YYYY-MM-DD.zip` (request calendar date). Quoted `filename=` is enough:

```http
Content-Disposition: attachment; filename="snimki-ot-gostite-2026-09-06.zip"
```

That matches Next’s `filename="data.csv"` example. `filename*` (RFC 5987 / 8187 UTF-8) is for non-ASCII names. Hyphens and digits need no encoding. Avoid `%XX` in `filename` (Safari does not decode; Chrome/Firefox do). ([MDN Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition))

`Content-Length` is optional. A streaming zip usually **omits** it (chunked body). Next’s stream examples do not set it.

---

## What changed in Next 16 vs older Route Handler / `NextResponse` posts

Nothing in 16 **replaces** `new Response` + headers for file downloads. The installed download example is still that.

Relevant version notes:

- **`middleware` → `proxy`** in 16. Cookie checks that used `middleware.ts` move to `proxy.ts`. Does not change Route Handler `Response` APIs. ([`version-16.md`](../../../node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md); prior gate research)
- **GET Route Handlers default to dynamic** since **15.0 RC** (were static). Old posts that treat `GET` as a cached static file are stale. ([`route.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md) Version History)
- **`context.params` is a `Promise`** since 15 RC. Await it if the archive path is dynamic. ([same](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md))
- **`cookies()` is async** (15+). Sync access is leftover. ([`cookies.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md))
- **`runtime = "experimental-edge"`** deprecated in 15; use `'edge'` or default `'nodejs'`. ([route segment config `index.md`](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md))
- **16 + Cache Components:** `dynamic` / `revalidate` / `fetchCache` segment exports are removed when Cache Components is on. A session-gated GET that calls `cookies()` is already request-time. ([same Version History](../../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md))
- `route.md` still shows an older AI SDK `StreamingTextResponse` snippet; the **canonical** raw-stream + attachment examples are in `streaming.md` (`ReadableStream` / `readableWebStream()` + `new Response`).

Pages Router `res.setHeader` / `res.send` API Routes are the pre-App-Router equivalent. This app is App Router only; do not mix them. ([`15-route-handlers.md`](../../../node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md))

---

## Concrete assembly (docs-shaped, not an implementation)

1. Add `app/admin/<segment>/route.ts` (not next to `page.tsx`). `GET` (or `POST`) on Node runtime.
2. `const ok = await verifySession()` (same DAL as the gallery). If `!ok`, `return new Response(null, { status: 401 })`.
3. Build a Web `ReadableStream` of zip bytes (or stream a temp file with `readableWebStream()`). Do not buffer the finished archive in a `Uint8Array` unless the pile is known-small (host-limits ticket).
4. Return `new Response(stream, { headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="snimki-ot-gostite-YYYY-MM-DD.zip"' } })`.
5. Do not `force-static`. Do not rely on `/admin` RSC or a future Proxy as the only gate.
6. Trigger from the gallery with a same-origin navigation or `fetch` (cookie is sent). Handle 401 in the UI; do not expect a Server Action to carry the zip.

---

## Source index

| Claim area | Primary |
| --- | --- |
| Route Handlers, methods, no `page`+`route` conflict, GET caching | `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `.../03-file-conventions/route.md` |
| Any content type / files / public endpoints / lambdas / Actions vs fetch | `.../01-app/02-guides/backend-for-frontend.md` |
| Stream body + `Content-Disposition` download example | `.../01-app/02-guides/streaming.md` |
| `NextResponse` helpers; do not override Action `Content-Type` | `.../01-app/03-api-reference/04-functions/next-response.md` |
| Actions: POST mutations; serialized returns | `.../01-app/01-getting-started/07-mutating-data.md`, `.../01-directives/use-server.md`, `.../02-guides/data-security.md` |
| `verifySession` in handlers; 401 vs 403 | `.../01-app/02-guides/authentication.md` |
| `cookies()` async, Route Handler read/write | `.../01-app/03-api-reference/04-functions/cookies.md` |
| `runtime`, `maxDuration`, 16 segment-config removals | `.../03-file-conventions/02-route-segment-config/` |
| middleware → proxy | `.../01-app/02-guides/upgrading/version-16.md` |
| Attachment + `filename` | [MDN Content-Disposition](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition) |
| `application/zip` | [MDN common MIME types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types) |
| 401 | [MDN 401](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401) |
| HttpOnly cookie still sent | [MDN Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie) |
