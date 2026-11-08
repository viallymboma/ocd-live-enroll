import "server-only";

import { cookies, headers } from "next/headers";

import type { Locale } from "@/lib/types";
import { DICTS, LOCALE_COOKIE } from "./index";

/**
 * The visitor's choice (toggle) wins. Otherwise French, unless the browser
 * asks for English before French (Accept-Language).
 */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (chosen === "en" || chosen === "fr") return chosen;
  const accept = ((await headers()).get("accept-language") ?? "").toLowerCase();
  const en = accept.search(/\ben\b|\ben-/);
  const fr = accept.search(/\bfr\b|\bfr-/);
  return en !== -1 && (fr === -1 || en < fr) ? "en" : "fr";
}

export async function getDict() {
  const locale = await getLocale();
  return { locale, t: DICTS[locale] };
}
