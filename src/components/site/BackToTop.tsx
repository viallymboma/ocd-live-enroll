"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/i18n/client";

/**
 * Back to the top: appears after about a screen of scrolling, its ring fills with the
 * reading progress, and it glides back up (instantly with reduced motion).
 */
export function BackToTop() {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  const ring = useRef<SVGCircleElement>(null);
  const C = 2 * Math.PI * 22;

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      setShown(window.scrollY > window.innerHeight * 0.9);
      if (ring.current) ring.current.style.strokeDashoffset = String(C * (1 - p));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [C]);

  return (
    <button
      type="button"
      aria-label={t.nav.backToTop}
      title={t.nav.backToTop}
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        (document.querySelector("header a") as HTMLElement | null)?.focus({ preventScroll: true });
      }}
      className={`group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 grid size-14 place-items-center rounded-full border border-line bg-ink-2/85 text-ivory shadow-[var(--shadow)] backdrop-blur-xl transition duration-500 ease-out-expo hover:-translate-y-1 hover:border-ember sm:right-6 ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
        <circle cx="24" cy="24" r="22" fill="none" stroke="var(--line)" strokeWidth="2" />
        <circle ref={ring} cx="24" cy="24" r="22" fill="none" stroke="var(--ember)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C} />
      </svg>
      <ArrowUp className="relative size-5 transition-transform duration-500 ease-out-expo group-hover:-translate-y-0.5" strokeWidth={2.4} />
    </button>
  );
}
