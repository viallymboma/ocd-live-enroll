"use client";

import { motion } from "motion/react";
import { useId, useState, useTransition } from "react";

import { setLocale } from "@/app/actions";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/lib/types";

/** Each language is named in ITS OWN language: the person who needs the switch can't read the current one. */
export const LANGUAGES: { value: Locale; short: string; name: string }[] = [
  { value: "fr", short: "FR", name: "Français" },
  { value: "en", short: "EN", name: "English" },
];

/** Shared by the header pill and the phone sheet: saves the cookie, re-renders the page in place. */
export function useSwitchLocale() {
  const { locale } = useI18n();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<Locale>(locale);
  const choose = (next: Locale) => {
    if (next === locale || pending) return;
    setTarget(next);
    start(() => setLocale(next));
  };
  return { locale, pending, target, choose };
}

/** FR | EN — both visible, a sliding thumb on the current one. */
export function LangToggle({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const { locale, pending, target, choose } = useSwitchLocale();
  const uid = useId();
  const shown = pending ? target : locale;
  return (
    <div role="radiogroup" aria-label={t.prefs.language} aria-busy={pending} className={`seg ${className}`}>
      {LANGUAGES.map((l) => {
        const on = shown === l.value;
        return (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={on}
            lang={l.value}
            title={l.name}
            aria-label={l.name}
            onClick={() => choose(l.value)}
            className={`seg-btn px-3 text-[11px] font-extrabold tracking-[0.14em] ${on ? "text-on-ember" : ""} ${pending ? "cursor-wait" : ""}`}
          >
            {on && <motion.span layoutId={`lang-${uid}`} className="seg-thumb" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative">{l.short}</span>
          </button>
        );
      })}
      <span className="sr-only" aria-live="polite">{pending ? LANGUAGES.find((l) => l.value === target)?.name : ""}</span>
    </div>
  );
}
