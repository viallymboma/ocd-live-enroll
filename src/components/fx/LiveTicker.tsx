"use client";

import { useRef } from "react";

import { useI18n } from "@/i18n/client";
import { gsap, prefersReduced, ScrollTrigger, useGSAP } from "./gsap";

/**
 * Two giant ribbons of words running in opposite directions. Scroll faster and they
 * speed up and lean into the movement (scroll velocity → timeScale + skew), then ease back.
 */
export function LiveTicker() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReduced()) return;
      const rows = gsap.utils.toArray<HTMLElement>("[data-track]", ref.current);
      const tweens = rows.map((row, i) =>
        gsap.fromTo(row, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, duration: 38, ease: "none", repeat: -1 }),
      );
      const skew = gsap.quickTo(rows, "skewX", { duration: 0.5, ease: "power3" });
      let calm: gsap.core.Tween[] = [];
      ScrollTrigger.create({
        trigger: ref.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate(self) {
          const v = self.getVelocity();
          const boost = 1 + Math.min(Math.abs(v) / 250, 6);
          calm.forEach((c) => c.kill());
          tweens.forEach((tw) => tw.timeScale(boost));
          skew(gsap.utils.clamp(-10, 10, v / -180));
          calm = tweens.map((tw) => gsap.to(tw, { timeScale: 1, duration: 1.2, ease: "power2.out", delay: 0.05 }));
          gsap.delayedCall(0.15, () => skew(0));
        },
      });
    },
    { scope: ref },
  );

  const words = t.ticker;
  const row = (outline: boolean) =>
    [...words, ...words].map((w, i) => (
      <span key={i} className="flex shrink-0 items-center gap-[0.35em] pr-[0.35em]">
        <span className={outline ? "text-transparent [-webkit-text-stroke:1.2px_var(--ember)]" : "text-ivory"}>{w}</span>
        <span aria-hidden className={`inline-block size-[0.22em] rounded-full ${i % 3 === 0 ? "bg-live" : "bg-ember"}`} />
      </span>
    ));

  return (
    <div ref={ref} aria-hidden className="relative overflow-hidden border-y border-line bg-ink-2/60 py-6 sm:py-9">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink to-transparent sm:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink to-transparent sm:w-40" />
      <div data-track className="display display-xl flex w-max whitespace-nowrap text-[clamp(2.4rem,7vw,5.6rem)] font-light italic leading-none will-change-transform">{row(false)}</div>
      <div data-track className="display mt-2 flex w-max whitespace-nowrap text-[clamp(2.4rem,7vw,5.6rem)] font-semibold uppercase leading-none tracking-tight will-change-transform">{row(true)}</div>
    </div>
  );
}
