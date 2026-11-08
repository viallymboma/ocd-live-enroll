"use client";

import { useSyncExternalStore } from "react";

import { THEME_COOKIE, type Theme, type ThemePref } from "@/lib/theme";

const EVENT = "ocd-theme";
const dark = () => window.matchMedia("(prefers-color-scheme: dark)");

function readPref(): ThemePref {
  const v = document.documentElement.dataset.themePref;
  return v === "light" || v === "system" ? v : "dark";
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** The saved preference (light / dark / system), live. */
export function useThemePref() {
  return useSyncExternalStore(subscribe, readPref, () => "dark" as ThemePref);
}

let followingSystem = false;
function followSystem() {
  if (followingSystem) return;
  followingSystem = true;
  dark().addEventListener("change", (e) => {
    if (readPref() === "system") document.documentElement.dataset.theme = e.matches ? "dark" : "light";
  });
}

/**
 * Applies a theme instantly (no reload) and saves it in a cookie the server reads.
 * When the colours actually change, the new theme grows as a circle from `origin`
 * (the button that was pressed) — View Transitions API, skipped on reduced motion.
 */
export function setThemePref(pref: ThemePref, origin?: { x: number; y: number }) {
  const d = document.documentElement;
  const resolved: Theme = pref === "system" ? (dark().matches ? "dark" : "light") : pref;
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=31536000; samesite=lax`;
  if (pref === "system") followSystem();
  const apply = () => {
    d.dataset.themePref = pref;
    d.dataset.theme = resolved;
    window.dispatchEvent(new Event(EVENT));
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (d.dataset.theme === resolved || reduce || !document.startViewTransition) {
    apply();
    return;
  }
  const x = origin?.x ?? window.innerWidth - 40;
  const y = origin?.y ?? 40;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const vt = document.startViewTransition(apply);
  vt.ready
    .then(() => {
      d.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 750, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}
