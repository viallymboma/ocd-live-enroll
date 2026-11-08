"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Registered once, in the browser only.
gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

/** Elements follow the pointer a little ("magnetic"). Mouse/trackpad only. Returns a cleanup. */
export function magnetic(els: Element[], strength = 0.18) {
  if (!finePointer() || prefersReduced()) return () => {};
  const offs = els.map((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "power3" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "power3" });
    const move = (e: Event) => {
      const p = e as PointerEvent;
      const r = el.getBoundingClientRect();
      xTo((p.clientX - (r.left + r.width / 2)) * strength);
      yTo((p.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  });
  return () => offs.forEach((f) => f());
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
