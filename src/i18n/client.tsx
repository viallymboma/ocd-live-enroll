"use client";

import { createContext, useContext } from "react";

import type { Locale } from "@/lib/types";
import { DICTS, type Dict } from "./index";

const Ctx = createContext<{ locale: Locale; t: Dict }>({ locale: "fr", t: DICTS.fr });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={{ locale, t: DICTS[locale] }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
