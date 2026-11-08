"use client";

import { Mic, ShoppingBag, Store, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

import { gsap, prefersReduced, useGSAP } from "@/components/fx/gsap";
import { AfricaScene } from "@/components/map/AfricaScene";
import { useI18n } from "@/i18n/client";

// three.js only loads in the browser, after the page is usable: it never delays the CTAs.
const Globe = dynamic(() => import("./Globe"), { ssr: false, loading: () => <Placeholder /> });

/** Positions stay INSIDE the box on a 360 px phone (nothing is cut at the edge). depth = parallax strength. */
const PILLS = [
  { role: "brand", Icon: Store, cls: "left-[2%] top-[22%]", depth: 0.6 },
  { role: "influencer", Icon: Mic, cls: "right-[2%] top-[6%]", depth: 1.1, live: true },
  { role: "product", Icon: ShoppingBag, cls: "right-[4%] top-[56%]", depth: 0.8 },
  { role: "audience", Icon: Users, cls: "left-[8%] bottom-[8%]", depth: 1.3 },
] as const;

export function HeroGlobe() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);

  // Parallax: each pill follows the mouse and the scroll at its own depth — the globe sits behind them.
  useGSAP(
    () => {
      if (prefersReduced()) return;
      const pills = gsap.utils.toArray<HTMLElement>("[data-depth]", ref.current);
      gsap.from(pills, { opacity: 0, scale: 0.6, y: 20, duration: 0.9, ease: "back.out(1.6)", stagger: 0.15, delay: 1.2 });
      pills.forEach((p) => {
        const d = Number(p.dataset.depth);
        gsap.to(p, { yPercent: -120 * d, ease: "none", scrollTrigger: { trigger: ref.current, start: "top 60%", end: "bottom top", scrub: true } });
      });
      if (!window.matchMedia("(pointer: fine)").matches) return;
      const movers = pills.map((p) => ({ d: Number(p.dataset.depth), x: gsap.quickTo(p.firstElementChild, "x", { duration: 1, ease: "power3" }), y: gsap.quickTo(p.firstElementChild, "y", { duration: 1, ease: "power3" }) }));
      const move = (e: PointerEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        movers.forEach((m) => {
          m.x(nx * 50 * m.d);
          m.y(ny * 36 * m.d);
        });
      };
      window.addEventListener("pointermove", move, { passive: true });
      return () => window.removeEventListener("pointermove", move);
    },
    { scope: ref },
  );

  if (failed) return <AfricaScene />;

  return (
    <div ref={ref} className="relative aspect-square w-full select-none" role="img" aria-label={t.hero.mapLabel}>
      <div aria-hidden className="pointer-events-none absolute inset-[10%] rounded-full bg-[radial-gradient(closest-side,rgb(210_105_42/0.25),transparent)] blur-2xl" />
      <Globe className="absolute inset-0" onFail={onFail} />
      {PILLS.map(({ role, Icon, cls, depth, ...rest }) => (
        <div key={role} data-depth={depth} className={`absolute ${cls}`}>
          <div className="flex animate-float items-center gap-2 rounded-full border border-line-2/80 bg-ink-2/85 py-1 pl-1 pr-3 shadow-[var(--shadow)] backdrop-blur-md" style={{ animationDelay: `${depth}s` }}>
            <span className="relative grid size-8 place-items-center rounded-full bg-ink-3 ring-1 ring-gold/40 sm:size-9">
              <Icon className="size-4 text-gold" strokeWidth={1.8} />
              <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-ink ${"live" in rest ? "bg-live" : "bg-ok"}`} />
            </span>
            <span className="whitespace-nowrap text-[11px] font-bold tracking-wide text-ivory sm:text-xs">
              {t.hero.roles[role]}
              {"live" in rest && <span className="ml-1.5 rounded-sm bg-live px-1 py-px text-[9px] font-extrabold tracking-widest text-white">LIVE</span>}
            </span>
          </div>
        </div>
      ))}
      <div className="pointer-events-none absolute bottom-[3%] right-[6%] text-right">
        <p className="text-[11px] font-extrabold tracking-[0.2em] text-ivory sm:text-xs">TOGO · LOMÉ</p>
        <p className="text-[10px] tracking-widest text-dust">6.13°N · 1.21°E</p>
      </div>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="absolute inset-[9%] animate-pulse rounded-full bg-[radial-gradient(circle_at_40%_35%,var(--ink-3),var(--ink-2)_70%)] shadow-[inset_0_0_60px_rgb(201_95_34/0.15)]" />
  );
}
