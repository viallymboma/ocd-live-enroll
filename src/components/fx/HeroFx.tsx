"use client";

import { useRef } from "react";

import { gsap, magnetic, prefersReduced, SplitText, useGSAP } from "./gsap";

/**
 * Hero choreography (GSAP):
 *  1. the headline arrives letter by letter from behind a mask, tilted, then settles;
 *  2. the lead line follows;
 *  3. the two entry cards are magnetic under the mouse;
 *  4. scrolling away, the copy drifts up and dims while the map stays — depth.
 * The CTAs are NEVER hidden: they work on the first paint, before any script.
 */
export function HeroFx({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const root = ref.current!;
      const reveal = root.querySelectorAll<HTMLElement>("[data-reveal]");
      if (prefersReduced()) {
        reveal.forEach((el) => el.classList.add("is-ready"));
        return;
      }
      const title = root.querySelector<HTMLElement>("[data-split]");
      if (title) {
        SplitText.create(title, {
          type: "lines,chars",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            title.classList.add("is-ready");
            return gsap.from(self.chars, { yPercent: 120, rotate: 10, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.025, delay: 0.05 });
          },
        });
      }
      const fades = root.querySelectorAll<HTMLElement>("[data-hero-fade]");
      fades.forEach((el) => el.classList.add("is-ready"));
      gsap.from(fades, { y: 28, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.1, delay: 0.55 });

      gsap.to("[data-hero-copy]", { yPercent: -10, opacity: 0.25, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true } });
      gsap.to("[data-hero-map]", { yPercent: 8, scale: 0.96, ease: "none", scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true } });

      return magnetic(Array.from(root.querySelectorAll("[data-magnetic]")), 0.08);
    },
    { scope: ref },
  );
  return <div ref={ref} className={className}>{children}</div>;
}
