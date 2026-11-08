import "server-only";

import { cookies } from "next/headers";

import type { Locale } from "@/lib/types";
import { DICTS, LOCALE_COOKIE } from "./index";

/** French first; English when the visitor chose it. */
export async function getLocale(): Promise<Locale> {
  return (await cookies()).get(LOCALE_COOKIE)?.value === "en" ? "en" : "fr";
}

export async function getDict() {
  const locale = await getLocale();
  return { locale, t: DICTS[locale] };
}
