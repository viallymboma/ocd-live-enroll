"use client";

import { useRef } from "react";

import { gsap, magnetic, prefersReduced, SplitText, useGSAP } from "./gsap";

/**
 * Closing scene, driven by the scrollbar: the continent's outline DRAWS itself while
 * the giant title rises word by word; the CTA is magnetic.
 */
export function FinalFx({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReduced()) return;
      const root = ref.current!;
      const path = root.querySelector<SVGPathElement>("[data-draw]");
      if (path) {
        const len = path.getTotalLength();
        gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: root, start: "top 85%", end: "bottom 60%", scrub: 1 } });
      }
      const title = root.querySelector<HTMLElement>("[data-scrub-title]");
      if (title) {
        const split = SplitText.create(title, { type: "words", mask: "words" });
        gsap.from(split.words, { yPercent: 110, opacity: 0, stagger: 0.08, ease: "power2.out", scrollTrigger: { trigger: title, start: "top 90%", end: "top 45%", scrub: 1 } });
      }
      return magnetic(Array.from(root.querySelectorAll("[data-magnetic]")), 0.3);
    },
    { scope: ref },
  );
  return <div ref={ref} className={className}>{children}</div>;
}
