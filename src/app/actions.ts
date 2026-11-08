"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { LOCALE_COOKIE } from "@/i18n";

export async function setLocale(locale: "fr" | "en") {
  (await cookies()).set(LOCALE_COOKIE, locale === "en" ? "en" : "fr", { path: "/", maxAge: 365 * 24 * 3600, sameSite: "lax" });
  revalidatePath("/", "layout");
}
