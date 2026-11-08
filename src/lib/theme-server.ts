import "server-only";

import { cookies } from "next/headers";

import { THEME_COOKIE, type ThemePref } from "./theme";

/**
 * The visitor's saved choice: light (default), dark, or "system" (follow the phone/computer).
 * Read on the server so the first paint is right; "system" is resolved by the inline
 * head script before paint (see THEME_SCRIPT).
 */
export async function getThemePref(): Promise<ThemePref> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return v === "dark" || v === "system" ? v : "light";
}
