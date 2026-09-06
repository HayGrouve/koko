import assert from "node:assert/strict";
import { test } from "node:test";
import {
  archiveDownloadFilename,
  archiveEntryNames,
} from "./archive-names.ts";

test("entry names keep the stored name and flatten path segments", () => {
  assert.deepEqual(
    archiveEntryNames([
      { name: "вечеря.jpg", key: "aaa111" },
      { name: "../secret/IMG_1.jpg", key: "bbb222" },
    ]),
    ["вечеря.jpg", "IMG_1.jpg"],
  );
});

test("clashing names keep the first and suffix later keys", () => {
  assert.deepEqual(
    archiveEntryNames([
      { name: "IMG_1234.jpg", key: "xxa1b2c3yy" },
      { name: "IMG_1234.jpg", key: "prefixa1b2c3" },
    ]),
    ["IMG_1234.jpg", "IMG_1234-a1b2c3.jpg"],
  );
});

test("archive filename uses the Europe/Sofia calendar date", () => {
  assert.equal(
    archiveDownloadFilename(new Date("2026-09-05T22:30:00.000Z")),
    "snimki-ot-gostite-2026-09-06.zip",
  );
});
