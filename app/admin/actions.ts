"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UTApi } from "uploadthing/server";
import { passwordsMatch } from "@/lib/admin-password";
import { verifySession } from "@/lib/admin-dal";
import { copy } from "@/lib/admin-copy";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/admin-session";
import { fetchGalleryPage } from "@/lib/fetch-gallery-page";
import type { GalleryPhoto } from "@/lib/fetch-gallery-page";

export type GateState = { error: string } | null;

export async function openGallery(
  _prev: GateState,
  formData: FormData,
): Promise<GateState> {
  const submitted = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";

  if (!passwordsMatch(submitted, expected)) {
    return { error: copy.gateError };
  }

  const token = createSessionToken(secret);
  if (token === null) {
    return { error: copy.gateError };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/admin");
}

export async function closeGallery(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/admin");
}

export async function loadMorePhotos(offset: number): Promise<{
  photos: GalleryPhoto[];
  hasMore: boolean;
}> {
  const session = await verifySession();
  if (!session) {
    redirect("/admin");
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return { photos: [], hasMore: false };
  }
  return fetchGalleryPage(offset);
}

export async function removePhoto(
  key: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await verifySession();
  if (!session) {
    redirect("/admin");
  }
  if (typeof key !== "string" || key.length === 0 || key.length > 300) {
    return { ok: false, error: copy.removeError };
  }
  try {
    await new UTApi().deleteFiles(key);
    return { ok: true };
  } catch {
    return { ok: false, error: copy.removeError };
  }
}
