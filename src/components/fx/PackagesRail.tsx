"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

import { gsap, prefersReduced, ScrollTrigger, useGSAP } from "./gsap";

export type RailCard = {
  id: string;
  href: string;
  name: string;
  description: string;
  duration: string;
  /** Share of the longest package, 0–1: the bar is drawn to scale. */
  ratio: number;
  hours: number;
  types: string;
  tbc: boolean;
  price: string;
  priceTbc: boolean;
  deliverables: string[];
};

/**
 * PACKAGES AS A 3D CAROUSEL DRIVEN BY THE VERTICAL SCROLL.
 * The section pins; scrolling down slides the cards sideways until the last one, then
 * the page carries on. Each card turns in 3D by its distance from the centre (the one in
 * front is flat, lit and lifted); its duration bar grows the first time it reaches the front.
 * Reduced motion / before JS: a plain swipeable row with snap points — nothing is hidden.
 */
export function PackagesRail({ header, cards, labels }: { header: React.ReactNode; cards: RailCard[]; labels: { choose: string; tbc: string; scroll: string } }) {
  const root = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (prefersReduced() || cards.length < 2) return;
      const vp = viewport.current!;
      const tr = track.current!;
      vp.classList.add("is-pinned");
      const els = gsap.utils.toArray<HTMLElement>("[data-card]", tr);
      const grown = new Set<number>();
      const distance = () => Math.max(0, tr.scrollWidth - vp.clientWidth);

      const shape = () => {
        const mid = window.innerWidth / 2;
        const phone = window.innerWidth < 640; // gentler 3D where one card fills the screen
        let active = 0;
        let best = Infinity;
        els.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const d = (r.left + r.width / 2 - mid) / window.innerWidth; // -1 … 1
          const ad = Math.abs(d);
          if (ad < best) {
            best = ad;
            active = i;
          }
          gsap.set(el, {
            rotateY: gsap.utils.clamp(-38, 38, d * (phone ? -30 : -55)),
            z: -ad * (phone ? 140 : 260),
            scale: 1 - Math.min(ad, 1) * 0.08,
            opacity: 1 - Math.min(ad, 1.2) * 0.45,
          });
          el.toggleAttribute("data-front", ad < 0.18);
          if (ad < 0.3 && !grown.has(i)) {
            grown.add(i);
            gsap.fromTo(el.querySelector("[data-bar]"), { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "expo.out" });
          }
        });
        if (counter.current) counter.current.textContent = String(active + 1).padStart(2, "0");
      };

      gsap.to(tr, {
        x: () => -distance(),
        ease: "none",
        // Shape the cards on every frame of the SMOOTHED movement (not on raw scroll events, which lag behind it).
        onUpdate() {
          shape();
          if (bar.current) bar.current.style.transform = `scaleX(${this.progress()})`;
        },
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefresh: shape,
        },
      });
      shape();
      ScrollTrigger.refresh();
      return () => vp.classList.remove("is-pinned");
    },
    { scope: root, dependencies: [cards.length] },
  );

  return (
    <section ref={root} id="packages" className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden border-y border-line bg-ink-2/40 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-8">
        {header}
        <div className="mt-6 flex items-center gap-4 text-xs font-bold tracking-[0.2em] text-dust sm:mt-8">
          <span className="tabular-nums text-ivory"><span ref={counter}>01</span> <span className="text-dust">/ {String(cards.length).padStart(2, "0")}</span></span>
          <span className="relative h-px flex-1 overflow-hidden bg-line">
            <span ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-ember" />
          </span>
          <span className="hidden uppercase sm:inline">{labels.scroll}</span>
        </div>
      </div>

      <div ref={viewport} className="rail-viewport mt-6 py-4 sm:mt-8">
        {/* side padding = half the screen minus half a card: the FIRST and the LAST card can both stand in the centre */}
        <div
          ref={track}
          className="flex w-max gap-4 px-[calc(50vw-min(41vw,200px))] [perspective:1600px] [transform-style:preserve-3d] sm:gap-6 sm:px-[calc(50vw-210px)]">
          {cards.map((c, i) => (
            <Link
              key={c.id}
              data-card
              href={c.href}
              className="rail-card group relative flex w-[min(82vw,400px)] shrink-0 snap-center flex-col overflow-hidden rounded-[28px] border border-line bg-ink-2 p-6 shadow-[var(--shadow)] [backface-visibility:hidden] [transform-style:preserve-3d] sm:w-[420px] sm:p-7"
            >
              {/* giant index behind the content */}
              <span aria-hidden className="display pointer-events-none absolute -right-3 -top-6 text-[9rem] font-extralight leading-none text-transparent [-webkit-text-stroke:1px_var(--line-2)]">
                {String(i + 1).padStart(2, "0")}
              </span>

              <span className="relative flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line-2 px-2.5 py-0.5 text-[11px] font-semibold text-sand">{c.types}</span>
                {c.tbc && <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold">{labels.tbc}</span>}
              </span>

              <span className="relative mt-8 block text-sm font-bold uppercase tracking-[0.2em] text-ember">{c.duration}</span>
              <h3 className="display relative mt-1 text-[2.6rem] font-normal leading-none text-ivory">{c.name}</h3>
              <p className="relative mt-3 line-clamp-3 text-sm leading-relaxed text-sand">{c.description}</p>

              {/* the duration ruler, to scale against the longest package */}
              <span aria-hidden className="relative mt-6 block">
                <span className="flex justify-between text-[9px] font-bold tracking-widest text-dust">
                  {Array.from({ length: c.hours + 1 }, (_, h) => <span key={h}>{h}H</span>)}
                </span>
                <span className="mt-1.5 block h-3 overflow-hidden rounded-full border border-line bg-ink">
                  <span data-bar className="block h-full origin-left rounded-full bg-gradient-to-r from-ember-deep via-ember to-ember-2" style={{ width: `${Math.max(c.ratio * 100, 4)}%` }} />
                </span>
              </span>

              <ul className="relative mt-6 grid gap-1.5 text-sm text-sand">
                {c.deliverables.slice(0, 4).map((d) => (
                  <li key={d} className="flex gap-2"><span className="text-gold">✦</span><span className="line-clamp-1">{d}</span></li>
                ))}
              </ul>

              <span className="relative mt-auto flex items-end justify-between gap-4 border-t border-line pt-5 [margin-top:max(1.5rem,auto)]">
                <span className={c.priceTbc ? "text-sm font-semibold text-gold" : "display text-2xl tabular-nums text-ivory sm:text-3xl"}>{c.price}</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2.5 text-sm font-bold text-on-ember transition duration-500 ease-out-expo group-hover:gap-3">
                  {labels.choose} <ArrowRight className="size-4" />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
