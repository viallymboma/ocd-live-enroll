import type { Locale } from "@/lib/types";
import { en } from "./en";
import { fr, type Dict } from "./fr";

export const LOCALE_COOKIE = "ocd_lang";
export const DICTS: Record<Locale, Dict> = { fr, en };
export type { Dict };
