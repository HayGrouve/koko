import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "koko_admin";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function createSessionToken(
  secret: string,
  nowMs = Date.now(),
): string | null {
  if (secret.length === 0) {
    return null;
  }
  const payload = Buffer.from(
    JSON.stringify({ exp: nowMs + SESSION_MAX_AGE_SECONDS * 1000 }),
    "utf8",
  ).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function sessionTokenIsValid(
  token: string,
  secret: string,
  nowMs = Date.now(),
): boolean {
  if (secret.length === 0 || token.length === 0) {
    return false;
  }
  const separator = token.indexOf(".");
  if (separator <= 0 || separator === token.length - 1) {
    return false;
  }
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  const signatureBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (signatureBytes.length !== expectedBytes.length) {
    return false;
  }
  if (!timingSafeEqual(signatureBytes, expectedBytes)) {
    return false;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: unknown };
    return typeof parsed.exp === "number" && parsed.exp > nowMs;
  } catch {
    return false;
  }
}
