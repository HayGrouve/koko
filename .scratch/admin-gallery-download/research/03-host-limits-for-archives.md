# Host limits for a server-built photo archive

Question: if this Next.js **16.2.4** app packs a zip of many UploadThing originals on the server (guest drop: up to **256 MB** per file, **10** files per session — `lib/upload-limits.ts`; gallery `listFiles` page size **50** — `LIST_PAGE_SIZE` in `lib/uploaded-photos.ts`), what **time, memory, and response-size** limits apply on the stock Vercel deploy path (`README.md` → Vercel Platform)?

**Answer:** Next.js Route Handlers have **no documented response-size or memory cap**. They expose `maxDuration` as a number whose meaning is “set by the deployment platform,” and they document streaming a `Response(ReadableStream)` (including large-file download). On **Vercel Functions**, a **buffered** zip is not viable: request **and** response payloads are **4.5 MB**. A **streamed** zip is the first-party escape from that 4.5 MB response cap, but it still counts against **invocation duration**, **function memory**, **`/tmp` (500 MB)**, and **file descriptors**. Those host limits, plus this app’s 256 MB originals, make a single “zip every original” invocation on default Hobby/Pro serverless **not a reliable product path**. UploadThing docs do **not** publish a numeric cap on how many CDN originals a server may `fetch` in one go.

Installed Next docs: `node_modules/next/dist/docs/` (`next@16.2.4`). Cross-checked Context7 `/vercel/next.js/v16.2.9` (closest tagged tree; same guides). Vercel and UploadThing: live first-party pages (URLs below).

---

## 0. Repo facts (not platform limits)

| Constant | Value | Meaning |
| --- | --- | --- |
| `MAX_IMAGE_SIZE` / `MAX_IMAGE_BYTES` | `"256MB"` / `256 * 1024 * 1024` | Per-file ceiling on `imageUploader` |
| `MAX_IMAGE_COUNT` | `10` | Per **guest drop / session**, not a lifetime gallery cap |
| `LIST_PAGE_SIZE` | `50` | Admin gallery `listFiles({ limit, offset })` page |

One drop can already be **10 × 256 MB ≈ 2.56 GB**. The admin list is 50 keys per page; the standing map wants **every** `Uploaded` file, not one page. Neither number is a host limit.

---

## 1. Next.js 16.2.x Route Handler / Node runtime

### Runtime

Default `runtime` for a Route Handler is **`'nodejs'`**. `'edge'` is the other option. (`route-segment-config/runtime.md`, `route.md` Segment Config Options)

Zip work that needs `node:fs`, zip libraries, or `FileHandle.readableWebStream()` belongs on Node, not Edge. Edge also has a **stricter Vercel clock** (must start sending within **25 s**, may stream up to **300 s** — Vercel limitations, Edge section).

### `maxDuration`

```ts
export const maxDuration = 5 // seconds; example in Next docs
```

Next’s own text: the option “allows you to set the maximum execution time (in seconds) for server-side logic.” **“Deployment platforms can use `maxDuration` from the Next.js build output to add specific execution limits.”** Default in the segment-config table: **“Set by deployment platform.”** Introduced `v13.4.10`. (`maxDuration.md`, `route-segment-config/index.md`)

Next does **not** document Hobby/Pro seconds. On Vercel, this export is how you raise the function clock (see §2).

Pages Router `pages/api` can also set `config.maxDuration` and `api.bodyParser.sizeLimit` (default parsed body **1mb**). (`02-pages/.../07-api-routes.md`) This app is App Router; that `bodyParser` config is **not** the Route Handler model.

### Request body size (Next, not Vercel)

App Router Route Handlers read the Web `Request` with `request.json()` / `request.formData()` / `request.text()`. The Route Handler guide documents **no** size limit and notes you do **not** need Pages `bodyParser`. (`route.md` Request Body / Webhooks)

Limits that *are* documented are for other entry points:

| Surface | Default | Source |
| --- | --- | --- |
| Server Actions `experimental.serverActions.bodySizeLimit` | **1MB** (configurable) | `serverActions.md` |
| Proxy body clone `experimental.proxyClientMaxBodySize` | **10MB**; excess is truncated + warned, request still proceeds | `proxyClientMaxBodySize.md` |

A **GET/POST that only starts a zip** (small JSON / no body) does not hit these. They matter only if the archive request itself carries a huge body (it should not).

### Streaming / response size

Next documents streaming Route Handlers with the Web Streams API: enqueue chunks, return `new Response(stream, { headers })`. Explicit use cases: “Server-Sent Events, **large file generation**, or any response where you want data to arrive progressively.” Also: stream a file **without loading it entirely into memory** via `FileHandle.readableWebStream()`. (`streaming.md` — Streaming in Route Handlers; same pattern in `route.md` Streaming)

Next’s streaming guide: **“Vercel supports streaming natively.”** Not all serverless hosts do (AWS Lambda needs an explicit response-streaming mode). Platform table: **Node.js server — Yes**, Docker — Yes, static export — No. (`streaming.md` Serverless platforms / Platform support)

**Not in Next 16.2.4 docs:** a Route Handler response-size ceiling, a Node memory ceiling, or a zip-specific API.

---

## 2. Vercel Hobby / Pro (stock Next deploy)

README: “The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?…)”. Limits below are current Vercel Functions docs. Fluid compute is **on by default for new projects** since **23 April 2025** ([Fluid compute](https://vercel.com/docs/fluid-compute)).

### Time (includes streaming)

From [Configuring Maximum Duration](https://vercel.com/docs/functions/configuring-functions/duration) and [Functions Limits](https://vercel.com/docs/functions/limitations):

> For request handlers, this includes time spent processing the request and sending the response, **including streamed responses**.

If the function does not finish in time: **504** `FUNCTION_INVOCATION_TIMEOUT`.

**With Fluid compute** (dashboard default for new projects; `vercel.json` `"fluid": true`):

| Plan | Default | Maximum | Extended maximum |
| --- | --- | --- | --- |
| Hobby | 300s (5 min) | 300s | — |
| Pro | 300s | 800s (GA) | 1800s (30 min, **beta**, per-function `maxDuration` only) |
| Enterprise | 300s | 800s | 1800s (same beta rules) |

Set duration in the App Router file: `export const maxDuration = …` ([duration docs](https://vercel.com/docs/functions/configuring-functions/duration), Next `maxDuration.md`). Precedence: function code → `vercel.json` → dashboard → Fluid defaults. ([Fluid compute](https://vercel.com/docs/fluid-compute))

Hobby **cannot** go past 300s even with Fluid.

**Without Fluid** (project created **before 23 Apr 2025** and Fluid still off) — [Vercel Limits](https://vercel.com/docs/limits):

| Plan | Default | Maximum |
| --- | --- | --- |
| Hobby | 10s | 60s |
| Pro | 15s | 300s |
| Enterprise | 15s | 900s |

Streaming does **not** pause this clock. [Streaming Functions](https://vercel.com/docs/functions/streaming-functions): “Vercel Functions have a [maximum duration](https://vercel.com/docs/functions/configuring-functions/duration), meaning that it isn't possible to stream indefinitely.” Same page: longer streams → consider Fluid + higher `maxDuration`.

[Runtimes](https://vercel.com/docs/functions/runtimes): Node streaming is **on by default**; still bound by max duration.

### Memory / CPU / disk

[Functions Limits](https://vercel.com/docs/functions/limitations) + [Memory](https://vercel.com/docs/functions/configuring-functions/memory):

| Plan | Default | Maximum |
| --- | --- | --- |
| Hobby | 2 GB / 1 vCPU | 2 GB / 1 vCPU (not configurable) |
| Pro / Enterprise | 2 GB / 1 vCPU | 4 GB / 2 vCPU (dashboard; **not** `vercel.json`) |

Also:

- Writable disk: **`/tmp` up to 500 MB**. Filesystem otherwise read-only. ([Runtimes — Features](https://vercel.com/docs/functions/runtimes))
- **1,024 file descriptors** shared across concurrent executions on the instance (runtime uses some). Open files + outbound HTTP sockets count. ([Functions Limits](https://vercel.com/docs/functions/limitations))
- Function **bundle** (code + deps, uncompressed): 250 MB standard; “large functions” up to 5 GB with Fluid + Active CPU. Unrelated to zip **payload**, but a heavy zip native addon can blow the bundle.

Fluid **does not** raise Hobby RAM. It can run **multiple invocations on one instance**; that **shares** the 2 GB / 1024-fd budget. One 256 MB `arrayBuffer()` plus zip state plus Node leaves little headroom if another request lands on the same instance.

### Response / request size — and whether a streamed zip counts

[Functions Limits — Request body size](https://vercel.com/docs/functions/limitations):

> The maximum payload size for the **request body or the response body** of a Vercel Function is **4.5 MB**. Excess request → **413** `FUNCTION_PAYLOAD_TOO_LARGE`.

Buffered zip of even one JPEG over a few MB fails this.

**Streamed responses are the documented exception for the response side.** [How do I bypass the 4.5MB body size limit](https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions):

- Request too large: upload **directly to the source** (do not proxy the file through the function).
- Response too large (`500` `FUNCTION_RESPONSE_PAYLOAD_TOO_LARGE`): reduce data per request, **or** “we recommend using **streaming functions, which don't have this limit**,” **or** “request directly from the source.”
- Functions “should be treated like a **lightweight API layer, not a media server**.” Large video/files: store on a media host; give the client a **pre-signed URL**.

So: a correctly streamed zip **does not** count against the 4.5 MB **response** cap. It **does** still count against **duration**, **memory**, **`/tmp`**, and **FDs**. A buffered `Buffer`/`Uint8Array` zip **does** hit 4.5 MB.

The request-side 4.5 MB cap is unchanged by streaming (archive download is typically a small GET/POST).

### Named escapes (only those Vercel / Next name)

| Escape | Who names it | What it buys for this zip |
| --- | --- | --- |
| Stream the response (`Response` + Web Streams / Next streaming guide) | Vercel bypass guide; Next `streaming.md` / `route.md` | Drops the 4.5 MB **response** cap. Does **not** drop time/RAM/`/tmp`. |
| Fluid compute | Vercel fluid + duration pages | New-project defaults: 300s Hobby/Pro. Existing pre-2025-04-23 projects may still be 10s/60s Hobby until Fluid is on. |
| Raise `maxDuration` | Next + Vercel duration | Hobby: still **300s max**. Pro: 800s, or 1800s beta on named Node/Bun/Python versions. |
| Raise memory (Pro dashboard) | Vercel memory docs | Up to **4 GB**. Hobby stays **2 GB**. |
| Split / shrink per request | Vercel `FUNCTION_PAYLOAD_TOO_LARGE` + bypass guide | Several smaller archives or fewer files per invocation — the closest first-party “chunking.” They do **not** name a zip-chunk protocol. |
| Do not proxy bytes; signed / CDN URL | Vercel bypass guide (“request directly from the source”) | Client (or a non-function host) pulls originals from UploadThing CDN. Matches UT’s public `ufs.sh` URLs. |
| Vercel Workflows | Duration + limitations notes | “Unlimited execution time” for pause/resume work; **not** a long HTTP download. |
| Node.js server / Docker (`next start`) | Next `17-deploying.md`, `streaming.md` platform table, `self-hosting.md` | No Vercel function `maxDuration` / 4.5 MB / 2 GB. Next still does not set a zip size. Self-host reverse proxy may impose **its own** payload/time limits (`self-hosting.md`). |

Vercel does **not** document “turn on Fluid and a 20 GB streamed zip will work on Hobby.” Fluid is already the default clock (300s), not an unbounded zip mode.

---

## 3. UploadThing: pulling many originals

There is **no** UT zip / export / bulk-download API on [UTApi](https://docs.uploadthing.com/api-reference/ut-api) or [OpenAPI 6.10.0](https://api.uploadthing.com/openapi-spec.json) (paths are list/delete/rename/ACL/signed access/upload — no archive).

How a server gets bytes: **HTTP GET** the CDN URL `https://<APP_ID>.ufs.sh/f/<FILE_KEY>` ([Working with Files](https://docs.uploadthing.com/working-with-files)). Private ACL: `generateSignedURL` then GET (expires ≤ 7 days). `listFiles` returns `key`, `name`, `size`, `status` — enough to walk the set; it does **not** return file bytes.

`listFiles` pagination (not a download cap):

- Docs default: `limit` **500**, `offset` **0**
- OpenAPI: `limit` max **100000**, `hasMore`

This app pages at **50** for the UI; an archive walk can use a larger `limit` (still one metadata call, then N CDN GETs).

**Published download / concurrency cap for originals: none.** UTApi `concurrency` **1–25** is for `uploadFiles` / `uploadFilesFromUrl`, not CDN GET. Rate-limit examples in [Auth](https://docs.uploadthing.com/concepts/auth-security) are **upload** middleware. Usage-based pricing blog: they **do not charge bandwidth** ([usage-based](https://docs.uploadthing.com/blog/usage-based)) — that is billing, not a QPS guarantee.

`listFiles` docs still say: do not use it as the primary DB; suited to admin/sync/debug. No numeric list or CDN rate is in OpenAPI or UTApi.

So UploadThing will not, by documented rule, stop a server from fetching 50 or 5 000 originals. The **host** (Vercel time/RAM) will.

---

## 4. Is one streamed zip on default Vercel serverless viable?

**Buffered zip (build the whole archive in memory or `/tmp`, then `new Response(buffer)`):** **No.** 4.5 MB response cap. One guest photo can be 256 MB. `/tmp` is 500 MB — a single 256 MB original plus a growing zip already risks the scratch disk if you materialize files.

**Streamed zip (`ReadableStream` / chunked transfer, originals piped one-at-a-time):** **Escapes 4.5 MB.** Still **not viable as the general “every original” path** on default Hobby/Pro Functions, given this app’s ceilings:

| Risk | Why |
| --- | --- |
| Time | Clock runs for the whole stream. Hobby **300s** (or **60s** if Fluid is off). One 256 MB CDN GET plus zip CPU can eat that; many files almost certainly will. Timeout → 504, client gets a truncated stream. |
| Memory | Hobby **2 GB** (Pro default 2 GB). `arrayBuffer()` on a 256 MB file is already a large fraction; buffering a 50-file page (worst case 50 × 256 MB) is **impossible**. Must stream **one file (or a small window) at a time** and never hold the full gallery. Fluid concurrency can share that 2 GB with other invocations. |
| Disk | `/tmp` **500 MB**. Do not assemble the zip on disk. |
| FDs | 1024/instance. Parallel `fetch` of many originals plus zip handles can exhaust this. |
| Product map | “Fail the whole request if one photo fails” + no progress: a 504 mid-stream is a broken download, not a clean error page (headers already sent — Next streaming HTTP contract). |

**Tiny galleries** (a handful of small JPEGs, streamed, `maxDuration` raised to the plan max) can work. That is not the same as “guests may drop 10 × 256 MB and the admin zips the whole wedding.”

**If the archive must be complete and large, first-party docs point to:** do not use the Function as a media server (signed/`ufs.sh` URLs or zip **elsewhere**); **split** into multiple smaller requests; raise Fluid/`maxDuration`/Pro memory if you still proxy a **bounded** stream; or run Next as a **Node.js server / Docker** (no Vercel function payload/duration). Vercel **Workflows** are named for long compute, not for holding an HTTP zip open.

---

## Sources (primary)

1. `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` — Route Handlers, streaming `Response`, no `bodyParser`
2. `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md` — `maxDuration`; platform applies it
3. `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md` — default “Set by deployment platform”; `runtime` default `nodejs`
4. `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`
5. `node_modules/next/dist/docs/01-app/02-guides/streaming.md` — Route Handler streams; large files; Vercel streams natively; Node server vs adapters
6. `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
7. `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverActions.md` — Action body 1MB
8. `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/proxyClientMaxBodySize.md` — proxy buffer 10MB
9. `node_modules/next/dist/docs/02-pages/03-building-your-application/01-routing/07-api-routes.md` — Pages `bodyParser.sizeLimit` / `maxDuration` (not this app’s surface)
10. `node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md` — Node.js server / Docker / adapters
11. `node_modules/next/dist/docs/01-app/02-guides/self-hosting.md` — reverse proxy may own payload limits
12. Context7 `/vercel/next.js/v16.2.9` — same guides as installed 16.2.4
13. https://vercel.com/docs/functions/limitations — 4.5 MB, memory, duration (incl. streamed), FDs, Fluid table
14. https://vercel.com/docs/functions/configuring-functions/duration — `maxDuration`; streamed time counts; Hobby/Pro table
15. https://vercel.com/docs/functions/configuring-functions/memory — Hobby 2 GB fixed; Pro 4 GB
16. https://vercel.com/docs/functions/runtimes — `/tmp` 500 MB; Node streaming default
17. https://vercel.com/docs/functions/streaming-functions — cannot stream past max duration
18. https://vercel.com/docs/fluid-compute — Fluid default 23 Apr 2025; plan clocks; precedence
19. https://vercel.com/docs/limits — pre-Fluid Hobby 10s/60s, Pro 15s/300s
20. https://vercel.com/guides/how-to-bypass-vercel-body-size-limit-serverless-functions — streaming has **no** 4.5 MB response limit; not a media server; split / source URLs
21. https://vercel.com/docs/errors/function_payload_too_large — split requests, external storage, client-direct upload
22. https://vercel.com/docs/errors/function_response_payload_too_large — 4.5 MB buffered response
23. https://docs.uploadthing.com/working-with-files — CDN GET pattern
24. https://docs.uploadthing.com/api-reference/ut-api — no zip API; `listFiles`; signed URLs; upload `concurrency` only
25. https://api.uploadthing.com/openapi-spec.json — `info.version` **6.10.0**; `listFiles` limit max 100000; no download/zip path
26. https://docs.uploadthing.com/blog/usage-based — no bandwidth charge (billing)
27. This repo: `lib/upload-limits.ts`, `lib/uploaded-photos.ts` (`LIST_PAGE_SIZE`), `README.md`, `package.json` (`next@16.2.4`)

**Not found in primary sources:** a numeric UploadThing CDN GET rate or “max originals per server request”; a Next.js Route Handler response-size number; Vercel documenting a zip-chunk file format; Fluid removing the 4.5 MB cap (streaming does that, not Fluid).
