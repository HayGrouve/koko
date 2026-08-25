import { timingSafeEqual } from "node:crypto";

export function passwordsMatch(submitted: string, expected: string): boolean {
  if (expected.length === 0) {
    return false;
  }
  const submittedBytes = Buffer.from(submitted);
  const expectedBytes = Buffer.from(expected);
  if (submittedBytes.length !== expectedBytes.length) {
    return false;
  }
  return timingSafeEqual(submittedBytes, expectedBytes);
}
