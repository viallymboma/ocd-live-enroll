"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "./gsap";

/** A thin orange line at the very top that fills as you read the page. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.fromTo(ref.current, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
  });
  return <div ref={ref} aria-hidden className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-ember-deep via-ember to-gold" />;
}
