import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { HeroFx } from "@/components/fx/HeroFx";
import { AfricaScene } from "@/components/map/AfricaScene";
import type { Dict } from "@/i18n";

/**
 * The CTAs are plain server-rendered links with NO entrance animation:
 * they are usable on the very first paint, before any script has loaded.
 */
export function Hero({ t }: { t: Dict }) {
  const words = [t.hero.title1, t.hero.title2];
  return (
    <section className="relative isolate overflow-hidden pt-20 sm:pt-28 lg:min-h-[100svh]">
      {/* stage light */}
      <div aria-hidden className="absolute -top-40 left-1/2 -z-10 h-[620px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(210_105_42/0.16),transparent)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-ink" />

      <HeroFx className="mx-auto grid max-w-[1400px] items-center gap-6 px-4 sm:px-8 lg:grid-cols-12 lg:gap-4">
        {/* the map: after the CTAs on phones (they come first), its own column on desktop */}
        <div data-hero-map className="relative order-2 mx-auto w-full max-w-[480px] pb-6 lg:col-span-6 lg:max-w-none lg:pb-0">
          <AfricaScene />
        </div>

        <div data-hero-copy className="relative z-10 order-1 lg:col-span-6 lg:py-16">
          <p className="kicker mb-5 flex items-center gap-2.5 animate-rise">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-live" />
            </span>
            {t.hero.eyebrow}
          </p>

          <h1 data-split data-reveal className="display text-[clamp(2.9rem,10.5vw,7.4rem)] font-light">
            {words.map((w, i) => (
              <span key={i} className="block pb-[0.06em]">{w}</span>
            ))}
            <span className="block pb-[0.06em]">
              <span className="italic text-sand">{t.hero.title3} </span>
              <span className="relative font-semibold text-ember not-italic">
                {t.hero.live}
                <span aria-hidden className="absolute -right-[0.32em] top-[0.12em] size-[0.17em] animate-blink rounded-full bg-live" />
              </span>
            </span>
          </h1>

          <p data-reveal data-hero-fade className="mt-6 max-w-[34rem] text-base leading-relaxed text-sand sm:text-lg">{t.hero.lead}</p>

          {/* THE TWO ENTRY POINTS — side by side on every width: on phones the two choices are compared at a glance */}
          <div className="mt-7 grid grid-cols-2 gap-2.5 sm:gap-4">
            <Link
              data-magnetic
              href="/reserver?type=online"
              className="group relative flex min-h-[10.5rem] flex-col justify-between gap-4 overflow-hidden rounded-[20px] bg-ember p-3.5 sm:min-h-[8.5rem] sm:rounded-[22px] sm:p-5 text-ink shadow-[0_24px_60px_-24px_rgb(210_105_42/0.9)] transition duration-500 ease-out-expo hover:-translate-y-1 hover:bg-ember-2"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="pt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] opacity-70 sm:text-[11px] sm:tracking-[0.2em]">01 · {t.liveType.onlineShort}</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-ember sm:size-10 transition duration-500 ease-out-expo group-hover:rotate-45">
                  <ArrowUpRight className="size-5" />
                </span>
              </span>
              <span>
                <span className="display block text-[1.45rem] font-semibold leading-[0.95] sm:text-[2rem]">{t.liveType.online}</span>
                <span className="mt-1.5 block text-xs font-medium leading-snug opacity-75 sm:text-sm">{t.liveType.onlineHint}</span>
              </span>
            </Link>

            <Link
              data-magnetic
              href="/reserver?type=onsite"
              className="group relative flex min-h-[10.5rem] flex-col justify-between gap-4 overflow-hidden rounded-[20px] border border-ivory/25 bg-ink-2/80 p-3.5 sm:min-h-[8.5rem] sm:rounded-[22px] sm:p-5 text-ivory backdrop-blur transition duration-500 ease-out-expo hover:-translate-y-1 hover:border-ivory/60"
            >
              <span className="flex items-start justify-between gap-2">
                <span className="pt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold sm:text-[11px] sm:tracking-[0.2em]">02 · {t.liveType.onsiteShort}<span className="hidden sm:inline"> · 6.13°N</span></span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ivory text-ink sm:size-10 transition duration-500 ease-out-expo group-hover:rotate-45">
                  <ArrowUpRight className="size-5" />
                </span>
              </span>
              <span>
                <span className="display block text-[1.45rem] font-semibold leading-[0.95] sm:text-[2rem]">
                  {t.liveType.onsite} <span className="block italic text-ember sm:inline">— {t.liveType.onsiteCity}</span>
                </span>
                <span className="mt-1.5 block text-xs font-medium leading-snug text-sand sm:text-sm">{t.liveType.onsiteHint}</span>
              </span>
            </Link>
          </div>
        </div>
      </HeroFx>
    </section>
  );
}
