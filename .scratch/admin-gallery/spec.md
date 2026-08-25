# Spec: password-gated admin gallery

Implement `/admin` so the couple can see uploaded photos and remove mistakes. Do not change the public uploader (`/`, `/success`) except where listed under Constraints. Do not add a database.

Vocabulary: [CONTEXT.md](../../CONTEXT.md). Decisions: [map](map.md), [UploadThing list and delete APIs](issues/01-uploadthing-list-delete.md), [Next.js password gate](issues/02-next-password-gate.md).

---

## Who and where

The couple (not guests) open **`/admin`**. That URL is not linked from `Header` or any public page. Knowledge of the URL is not a substitute for the gate.

Language: **Bulgarian**, same fonts and surfaces as the wedding site (`Display` / `Narrative` / `Header`, dashed-border cards, primary pill buttons). Do not introduce a dashboard chrome, sidebar, or English admin jargon.

---

## Env

| Name | Role |
| --- | --- |
| `ADMIN_PASSWORD` | Compared only on the gate POST. Server-only. Never `NEXT_PUBLIC_*`. |
| `SESSION_SECRET` | Signs/encrypts the session cookie. Not the password. Server-only. |
| `UPLOADTHING_TOKEN` | Already required for uploads. `UTApi` uses it. Contains `appId` + API key. |

Missing `ADMIN_PASSWORD` or `SESSION_SECRET` at runtime: fail the gate Action with a generic error; do not throw the secret names or values into client HTML.

---

## Gate

No accounts. One shared password.

**Page:** `GET /admin` with no valid session renders a password form (not a separate `/login` route). `GET /admin` with a valid session renders the admin gallery.

**Submit:** Server Action. Read the password from `FormData`. Compare to `ADMIN_PASSWORD` with `crypto.timingSafeEqual` on equal-length `Buffer`s. If lengths differ, do not call `timingSafeEqual` (it throws); treat as failure. Never log the submitted value or the env secret. Never put the password in the URL.

**Success:** `cookies().set` an **httpOnly** session cookie: signed/encrypted payload (e.g. Jose, as in Next’s auth guide), **not** the password bytes. Flags: `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `maxAge` 7 days, `secure: true` in production (HTTPS). Then `redirect('/admin')` (303 from the Action).

**Failure:** return Action state. Copy: **«Грешна парола.»** Same message for wrong password, missing env, and malformed session setup. No 401 HTML.

**Logout:** control on the gallery (not on the gate). Server Action: `cookies().delete` the session cookie, `redirect('/admin')`. Label: **«Затвори достъпа»**.

**Checks (required):** Layouts are **not** a security boundary. `verifySession()` in the `/admin` page (RSC) and **inside every** Server Action that lists or removes. Optional `proxy.ts` may redirect unauthenticated hits to `/admin`, but must not loop (the gate **is** `/admin`) and must not be the only check. Do not use experimental `unauthorized()`.

Cookie writes only in Server Actions or Route Handlers, never while rendering RSC.

No lockout / rate limit on failed passwords in this spec.

---

## Admin gallery

Server Component loads the first page via `UTApi` from `uploadthing/server` (`new UTApi()` / `UPLOADTHING_TOKEN`). **Server-only** — never import `UTApi` in a client module.

```ts
await utapi.listFiles({ limit: 50, offset })
```

`offset` starts at 0. **«Още снимки»** appears while `hasMore` is true; each click loads the next `offset += 50` (against UploadThing’s list, not the filtered display count). No cursor API.

**Show** rows with `status === "Uploaded"`. Skip `Uploading`, `Failed`, and `Deletion Pending` in the grid.

**Each cell**

- Thumbnail: `<img>` (or equivalent) at `https://<appId>.ufs.sh/f/<key>`. `appId` comes from decoding `UPLOADTHING_TOKEN` (base64 JSON with `appId`). Do not use list fields `url` / `ufsUrl` — they are not returned. Prefer `ufs.sh`, not `utfs.io`.
- `name`
- `uploadedAt` as epoch **ms**, formatted for `bg` locale (date + time)
- `size` in bytes, shown human-readable (e.g. `2,4 МБ`)

Grid: same 2-column / `sm:3` photo tiles as the public picker. Reuse `Header`. Title: **«Снимки от гостите»**. Subtitle: **«Какво са изпратили гостите. Премахнете само ако трябва.»**

**Empty** (valid session, no `Uploaded` photos on the loaded pages and `!hasMore`): **«Все още няма качени снимки.»**

Listing is the whole UploadThing **app** for this token. There is no filter by `imageUploader`. Do not persist keys in `onUploadComplete` for this feature.

---

## Removal

One uploaded photo at a time. Identifier: `key` (`fileKey`). This app does not set `customId`.

**Confirmation** (in-app dialog, not `window.confirm`):

- Shows the same thumbnail
- Body: **«Да премахнем ли тази снимка? Няма връщане назад.»**
- Confirm: **«Премахни»**
- Cancel: **«Остави я»** (closes the dialog; no request)

Removal Server Action (re-verify session first): `utapi.deleteFiles(key)`. If there is no session: treat as unauthorized — if this stays a Server Action, redirect to `/admin` / return an error the UI can show; if you add a Route Handler, respond **401**. Do not use 403 (no roles).

On success: drop that tile from the UI. UploadThing **marks** deletion; storage may still serve the URL briefly (`Deletion Pending`). Do not wait for CDN 404.

On UT failure: keep the tile; show **«Не успяхме да премахнем снимката.»** Do not log keys in a way that dumps the whole list to the client console in production.

---

## Copy (complete)

| Surface | Bulgarian |
| --- | --- |
| Gate heading | Парола за преглед |
| Gate hint | За Иван и Десислава. Не е за гостите. |
| Password field | Парола |
| Gate submit | Отвори снимките |
| Gate error | Грешна парола. |
| Gallery title | Снимки от гостите |
| Gallery subtitle | Какво са изпратили гостите. Премахнете само ако трябва. |
| Logout | Затвори достъпа |
| Empty | Все още няма качени снимки. |
| Load more | Още снимки |
| Per-tile remove (aria) | Премахни снимката |
| Confirm body | Да премахнем ли тази снимка? Няма връщане назад. |
| Confirm | Премахни |
| Cancel | Остави я |
| Remove error | Не успяхме да премахнем снимката. |

Do not use: Admin, Dashboard, Login, Sign in, CMS, Media library, “Are you sure?”, `window.confirm`.

---

## Out of scope (do not build)

- Public gallery, sharing links, guest accounts, OAuth, 2FA
- Bulk removal, zip/download/export, rename, captions, guest names
- App database / persisting keys on upload
- Gate lockout / IP rate limits
- Filtering the UT list by router slug
- Experimental Next `unauthorized()` / `authInterrupts`

---

## Done when

- `/admin` without a cookie shows the gate; wrong password shows only **«Грешна парола.»**
- Correct password sets the httpOnly cookie and shows the grid
- Grid lists UT `Uploaded` photos (50 + load-more) with thumbnail, name, time, size
- Remove requires the dialog; cancel does not call `deleteFiles`; confirm deletes by `key` and the tile goes away
- Logout clears the cookie and returns to the gate
- Public `/` has no new link to `/admin`
