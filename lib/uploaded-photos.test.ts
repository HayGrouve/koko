import assert from "node:assert/strict";
import { test } from "node:test";
import {
  appIdFromUploadthingToken,
  formatByteSize,
  formatUploadedDate,
  formatUploadedTime,
  photoCdnUrl,
  uploadedPhotos,
} from "./uploaded-photos.ts";

test("app id is read from the UploadThing token payload", () => {
  const token = Buffer.from(
    JSON.stringify({
      apiKey: "sk_test",
      appId: "abc123xyz",
      regions: ["sea2"],
    }),
    "utf8",
  ).toString("base64");
  assert.equal(appIdFromUploadthingToken(token), "abc123xyz");
});

test("photo URL uses ufs.sh and the file key", () => {
  assert.equal(
    photoCdnUrl("abc123xyz", "fileKeyOne"),
    "https://abc123xyz.ufs.sh/f/fileKeyOne",
  );
});

test("only Uploaded photos are kept", () => {
  const kept = uploadedPhotos([
    {
      key: "a",
      name: "a.jpg",
      size: 10,
      uploadedAt: 1,
      status: "Uploaded",
    },
    {
      key: "b",
      name: "b.jpg",
      size: 10,
      uploadedAt: 1,
      status: "Deletion Pending",
    },
    {
      key: "c",
      name: "c.jpg",
      size: 10,
      uploadedAt: 1,
      status: "Failed",
    },
    {
      key: "d",
      name: "d.jpg",
      size: 10,
      uploadedAt: 1,
      status: "Uploading",
    },
  ]);
  assert.deepEqual(
    kept.map((photo) => photo.key),
    ["a"],
  );
});

test("byte size uses Bulgarian decimal and МБ", () => {
  assert.equal(formatByteSize(2_400_000), "2,4 МБ");
});

test("upload date and time are separate Bulgarian labels", () => {
  const uploadedAt = new Date(2026, 7, 25, 23, 26).getTime();
  assert.equal(formatUploadedDate(uploadedAt), "25.08.26 г.");
  assert.equal(formatUploadedTime(uploadedAt), "23:26");
});
