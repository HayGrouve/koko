import "server-only";

import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  sessionTokenIsValid,
} from "@/lib/admin-session";

export async function verifySession(): Promise<boolean> {
  const secret = process.env.SESSION_SECRET ?? "";
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }
  return sessionTokenIsValid(token, secret);
}
