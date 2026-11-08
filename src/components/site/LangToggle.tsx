"use client";

import { useTransition } from "react";

import { setLocale } from "@/app/actions";
import { useI18n } from "@/i18n/client";

export function LangToggle({ className = "" }: { className?: string }) {
  const { locale, t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => setLocale(locale === "fr" ? "en" : "fr"))}
      aria-label={t.nav.langLabel}
      disabled={pending}
      className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-line-2 px-3 text-xs font-bold tracking-widest text-sand transition hover:border-sand hover:text-ivory disabled:opacity-50 ${className}`}
    >
      {t.nav.lang}
    </button>
  );
}
