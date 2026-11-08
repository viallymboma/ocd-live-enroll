"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";

import { setThemePref, useThemePref } from "@/hooks/useTheme";
import { useI18n } from "@/i18n/client";
import type { ThemePref } from "@/lib/theme";

export const THEME_OPTIONS: { value: ThemePref; Icon: typeof Sun }[] = [
  { value: "light", Icon: Sun },
  { value: "system", Icon: Monitor },
  { value: "dark", Icon: Moon },
];

/**
 * Light · System · Dark — a segmented control with a sliding thumb.
 * Every option is visible (no guessing what the icon will do next), and the
 * new theme sweeps in as a circle from the pressed button.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const pref = useThemePref();
  const uid = useId();
  return (
    <div role="radiogroup" aria-label={t.prefs.appearance} className={`seg ${className}`}>
      {THEME_OPTIONS.map(({ value, Icon }) => {
        const on = pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={t.prefs[value]}
            title={t.prefs[value]}
            onClick={(e) => setThemePref(value, { x: e.clientX, y: e.clientY })}
            className={`seg-btn w-9 ${on ? "text-on-ember" : ""}`}
          >
            {on && <motion.span layoutId={`theme-${uid}`} className="seg-thumb" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <Icon className="relative size-[15px]" strokeWidth={2.2} />
          </button>
        );
      })}
    </div>
  );
}
