import assert from "node:assert/strict";
import { test } from "node:test";
import { passwordsMatch } from "./admin-password.ts";

test("matching passwords are accepted", () => {
  assert.equal(passwordsMatch("розова", "розова"), true);
});

test("wrong password is rejected", () => {
  assert.equal(passwordsMatch("розова", "синя"), false);
});

test("different lengths are rejected without throwing", () => {
  assert.equal(passwordsMatch("aa", "a"), false);
});

test("empty expected password is always rejected", () => {
  assert.equal(passwordsMatch("", ""), false);
  assert.equal(passwordsMatch("secret", ""), false);
});
