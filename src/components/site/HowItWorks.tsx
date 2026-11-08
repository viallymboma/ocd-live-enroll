"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";

import { useI18n } from "@/i18n/client";

/** Editorial steps: a sticky title, a line that draws itself as you scroll, oversized numerals. */
export function HowItWorks() {
  const { t } = useI18n();
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const line = useSpring(scrollYProgress, { stiffness: 80, damping: 24 });

  return (
    <section id="how" className="relative mx-auto max-w-[1400px] scroll-mt-10 px-4 py-24 sm:px-8 sm:py-36">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <p className="kicker mb-4">{t.how.kicker}</p>
            <h2 className="display text-[clamp(2.4rem,6vw,4.8rem)] font-light">{t.how.title}</h2>
          </div>
        </div>
        <ol ref={ref} className="relative lg:col-span-7">
          <span aria-hidden className="absolute left-[1.15rem] top-2 bottom-2 w-px bg-line sm:left-[1.6rem]" />
          <motion.span aria-hidden style={reduce ? undefined : { scaleY: line }} className="absolute left-[1.15rem] top-2 bottom-2 w-px origin-top bg-gradient-to-b from-ember to-gold sm:left-[1.6rem]" />
          {t.how.steps.map((s, i) => (
            <motion.li
              key={i}
              className="relative grid grid-cols-[2.3rem_1fr] gap-5 pb-14 last:pb-0 sm:grid-cols-[3.2rem_1fr] sm:gap-8"
              initial={reduce ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="relative z-10 mt-1 grid size-[2.3rem] place-items-center rounded-full border border-line-2 bg-ink text-xs font-bold text-gold sm:size-[3.2rem] sm:text-sm">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <span aria-hidden className="display pointer-events-none block text-[clamp(4rem,10vw,7.5rem)] font-extralight leading-[0.8] text-transparent [-webkit-text-stroke:1px_rgb(224_164_88/0.35)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="-mt-6 text-2xl font-bold text-ivory sm:-mt-9 sm:text-3xl">{s.title}</h3>
                <p className="mt-3 max-w-md text-base leading-relaxed text-sand">{s.text}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
