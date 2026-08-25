import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSessionToken,
  sessionTokenIsValid,
} from "./admin-session.ts";

test("session token verifies with the same secret", () => {
  const token = createSessionToken("session-secret", 1_000_000);
  assert.ok(token);
  assert.equal(sessionTokenIsValid(token, "session-secret", 1_000_000), true);
});

test("session token is rejected with the wrong secret", () => {
  const token = createSessionToken("session-secret", 1_000_000);
  assert.ok(token);
  assert.equal(sessionTokenIsValid(token, "other-secret", 1_000_000), false);
});

test("expired session token is rejected", () => {
  const token = createSessionToken("session-secret", 1_000_000);
  assert.ok(token);
  const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
  assert.equal(
    sessionTokenIsValid(token, "session-secret", 1_000_000 + eightDaysMs),
    false,
  );
});

test("empty secret does not create a session", () => {
  assert.equal(createSessionToken(""), null);
});
