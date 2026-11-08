"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { setThemePref, useThemePref } from "@/hooks/useTheme";
import { useI18n } from "@/i18n/client";
import { LANGUAGES, LangToggle, useSwitchLocale } from "./LangToggle";
import { THEME_OPTIONS, ThemeToggle } from "./ThemeToggle";

/**
 * Language + theme, everywhere.
 * Wide screens: the two segmented pills side by side.
 * Phones: ONE compact chip ("FR ☀") that opens a bottom sheet with big, thumb-sized choices
 * and a live preview of each theme — two cramped pills don't fit next to a logo on 360 px.
 */
export function Preferences({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="hidden items-center gap-2 md:flex">
        <LangToggle />
        <ThemeToggle />
      </div>
      <PreferencesSheetButton className="md:hidden" />
    </div>
  );
}

export function PreferencesSheetButton({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pref = useThemePref();
  const { locale, pending, target, choose } = useSwitchLocale();
  const Current = THEME_OPTIONS.find((o) => o.value === pref)!.Icon;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t.prefs.open} aria-haspopup="dialog" className={`seg h-10 gap-2 px-3 text-sand hover:text-ivory ${className}`}>
        <span className="text-[11px] font-extrabold tracking-[0.14em]">{locale.toUpperCase()}</span>
        <span aria-hidden className="h-4 w-px bg-line-2" />
        <Current className="size-4" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.prefs.title} closeLabel={t.ui.close}>
        <p className="kicker mb-3">{t.prefs.language}</p>
        <div role="radiogroup" aria-label={t.prefs.language} className="grid gap-2">
          {LANGUAGES.map((l) => {
            const on = (pending ? target : locale) === l.value;
            return (
              <button
                key={l.value}
                type="button"
                role="radio"
                aria-checked={on}
                lang={l.value}
                onClick={() => choose(l.value)}
                className={`flex min-h-14 items-center gap-4 rounded-2xl border px-4 text-left transition ${on ? "border-ember bg-ember/10" : "border-line bg-ink-2 hover:border-line-2"}`}
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-extrabold tracking-widest ${on ? "bg-ember text-on-ember" : "bg-ink-3 text-sand"}`}>{l.short}</span>
                <span className="flex-1 text-base font-semibold text-ivory">{l.name}</span>
                {pending && target === l.value ? <LoaderCircle className="size-5 animate-spin text-ember" /> : on && <Check className="size-5 text-ember" strokeWidth={2.6} />}
              </button>
            );
          })}
        </div>

        <p className="kicker mb-3 mt-7">{t.prefs.appearance}</p>
        <div role="radiogroup" aria-label={t.prefs.appearance} className="grid grid-cols-3 gap-2.5">
          {THEME_OPTIONS.map(({ value, Icon }) => {
            const on = pref === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={(e) => setThemePref(value, { x: e.clientX, y: e.clientY })}
                className={`rounded-2xl border p-2 text-left transition ${on ? "border-ember ring-2 ring-ember/30" : "border-line hover:border-line-2"}`}
              >
                <ThemePreview kind={value} />
                <span className="mt-2 flex items-center gap-1.5 px-1 pb-0.5 text-sm font-semibold text-ivory">
                  <Icon className="size-3.5 text-dust" /> {t.prefs[value]}
                </span>
              </button>
            );
          })}
        </div>
        <p className="hint mt-3">{t.prefs.systemHint}</p>
      </BottomSheet>
    </>
  );
}

function Paper({ dark }: { dark: boolean }) {
  return (
    <div className={`absolute inset-0 p-2 ${dark ? "bg-[#0e0c0b]" : "bg-[#faf6ef]"}`}>
      <div className={`h-1.5 w-8 rounded-full ${dark ? "bg-[#f3ebdd]" : "bg-[#1a1411]"}`} />
      <div className={`mt-1.5 h-1 w-12 rounded-full ${dark ? "bg-[#3d342d]" : "bg-[#d8cab7]"}`} />
      <div className={`mt-1 h-1 w-10 rounded-full ${dark ? "bg-[#3d342d]" : "bg-[#d8cab7]"}`} />
      <div className="mt-2.5 h-3 w-9 rounded-full bg-[#d2692a]" />
    </div>
  );
}

/** A tiny drawing of the page in that theme. "System" is split diagonally. */
function ThemePreview({ kind }: { kind: "light" | "dark" | "system" }) {
  return (
    <div aria-hidden className="relative h-16 overflow-hidden rounded-xl border border-line">
      {kind !== "dark" && <Paper dark={false} />}
      {kind === "dark" && <Paper dark />}
      {kind === "system" && (
        <div className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]">
          <Paper dark />
        </div>
      )}
    </div>
  );
}
