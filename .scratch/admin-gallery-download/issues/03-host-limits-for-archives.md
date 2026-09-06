Type: research
Status: resolved

## Question

What **time, memory, and response-size limits** apply if this Next.js 16.2.4 app packs a zip of many uploaded photos on the server (each guest upload may be up to 256 MB; the gallery already pages `listFiles` by 50)?

Need from primary sources for:

- Next.js Route Handler / Node runtime limits documented for 16.2.x (`maxDuration`, body size, streaming).
- Vercel’s documented Hobby/Pro serverless limits (stock Next deploy path in the repo README), and whether a streamed zip still counts against them.
- Any UploadThing-documented constraint that would cap how many originals a server can pull in one go.

The answer should tell an implementer whether a single streamed zip on a default Vercel serverless function is viable, and what the docs say to do if it is not (fluid compute, Node server, chunking — only if first-party docs name those escapes).

Cite each claim back to Next.js, Vercel, or UploadThing docs.

## Answer

A **buffered** zip on Vercel Functions is not viable (4.5 MB request/response payload). A **streamed** zip is the first-party escape from that 4.5 MB **response** cap, but it still counts against **duration** (Hobby 300s / 60s if Fluid is off), **memory** (Hobby 2 GB), **`/tmp` 500 MB**, and **FDs**. Given 256 MB originals, one “zip every photo” invocation on default Hobby/Pro serverless is not a reliable product path. UploadThing does not publish a numeric cap on CDN GETs. Named escapes: stream; split into smaller requests; raise Fluid/`maxDuration`/Pro RAM; don’t proxy media (signed/`ufs.sh` URLs); Workflows for long compute; or `next start` / Docker (Next deploying docs).

Full note: [research/03-host-limits-for-archives.md](../research/03-host-limits-for-archives.md)

## Comments

- 2026-09-06: Researched Next 16.2.4 installed docs, live Vercel Functions/Fluid/limits + bypass guide, UploadThing UTApi/OpenAPI/working-with-files. Verdict: stream to beat 4.5 MB; still not viable as a general archive of 256 MB originals on default Vercel Functions.
