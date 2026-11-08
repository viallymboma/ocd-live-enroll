"use client";

import { gsap, prefersReduced, useGSAP } from "./gsap";

/**
 * Page-wide parallax: any element with data-speed="1.3" moves 30 % faster than the scroll,
 * "0.7" 30 % slower (it seems further away). Mounted once on the page; reduced motion = off.
 */
export function Parallax() {
  useGSAP(() => {
    if (prefersReduced()) return;
    gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
      const speed = Number(el.dataset.speed) || 1;
      gsap.fromTo(
        el,
        { y: () => (speed - 1) * window.innerHeight * 0.35 },
        { y: () => -(speed - 1) * window.innerHeight * 0.35, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } },
      );
    });
  });
  return null;
}
