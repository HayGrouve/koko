import assert from "node:assert/strict";
import { test } from "node:test";
import { zipStoredEntries } from "./zip-store-stream.ts";

test("stored zip contains each entry name and bytes", async () => {
  const stream = zipStoredEntries([
    { name: "a.txt", body: () => readableFrom("hello") },
    { name: "b.txt", body: () => readableFrom("bye") },
  ]);
  const bytes = await readAll(stream);
  const text = Buffer.from(bytes).toString("binary");

  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.ok(text.includes("a.txt"));
  assert.ok(text.includes("hello"));
  assert.ok(text.includes("b.txt"));
  assert.ok(text.includes("bye"));
});

test("stored zip finishes when crc has the high bit set", async () => {
  const payload = new Uint8Array(100).fill(1);
  const stream = zipStoredEntries([
    {
      name: "ones.bin",
      body: () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue(payload);
            controller.close();
          },
        }),
    },
  ]);

  const bytes = await readAll(stream);
  assert.ok(bytes.byteLength > payload.byteLength);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
});

function readableFrom(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
