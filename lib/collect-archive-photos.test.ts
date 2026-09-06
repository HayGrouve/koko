import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectUploadedPhotosForArchive,
  type ListedPhoto,
} from "./uploaded-photos.ts";

function photo(key: string, status: string): ListedPhoto {
  return {
    key,
    name: `${key}.jpg`,
    size: 10,
    uploadedAt: 1,
    status,
  };
}

test("collects Uploaded photos across list pages and skips other statuses", async () => {
  const pages = [
    {
      files: [photo("a", "Uploaded"), photo("skip", "Failed")],
      hasMore: true,
    },
    {
      files: [photo("b", "Uploaded"), photo("pending", "Deletion Pending")],
      hasMore: false,
    },
  ];

  const collected = await collectUploadedPhotosForArchive(async ({ offset }) => {
    const pageIndex = offset === 0 ? 0 : 1;
    const page = pages[pageIndex];
    assert.ok(page);
    return page;
  });

  assert.deepEqual(
    collected.map((item) => item.key),
    ["a", "b"],
  );
});
