"use client";

import { useRef } from "react";

import { gsap, prefersReduced, ScrollTrigger, useGSAP } from "./gsap";

/**
 * Packages on scroll: rows rise in turn, each duration bar GROWS to its true length,
 * and each price counts up to its value.
 */
export function PackagesFx({ children, locale }: { children: React.ReactNode; locale: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReduced()) return;
      const rows = gsap.utils.toArray<HTMLElement>("[data-pkg-row]", ref.current);
      gsap.set(rows, { y: 50, opacity: 0 });
      ScrollTrigger.batch(rows, {
        start: "top 88%",
        once: true,
        onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.12 }),
      });
      gsap.utils.toArray<HTMLElement>("[data-bar]", ref.current).forEach((bar) => {
        gsap.from(bar, { scaleX: 0, transformOrigin: "left center", duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: bar, start: "top 88%", once: true } });
      });
      const nf = new Intl.NumberFormat(locale);
      const counters = gsap.utils.toArray<HTMLElement>("[data-count]", ref.current);
      counters.forEach((el) => {
        // Remember the real price ONCE: in dev, React runs this twice and the 2nd run would read a half-counted number.
        const final = (el.dataset.final ??= el.textContent ?? "");
        const value = Number(el.dataset.count);
        if (!value) return;
        const o = { v: 0 };
        gsap.to(o, {
          v: value,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
          onUpdate: () => {
            el.textContent = final.replace(/\d[\d\s  .,]*\d|\d/, nf.format(Math.round(o.v / 100) * 100));
          },
          onComplete: () => {
            el.textContent = final;
          },
        });
      });
      // Leaving (unmount / dev re-run) always puts the real prices back.
      return () => counters.forEach((el) => (el.textContent = el.dataset.final ?? el.textContent));
    },
    { scope: ref },
  );
  return <div ref={ref}>{children}</div>;
}
