import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

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

      <div className="mx-auto grid max-w-[1400px] items-center gap-6 px-4 sm:px-8 lg:grid-cols-12 lg:gap-4">
        {/* the map: after the CTAs on phones (they come first), its own column on desktop */}
        <div className="relative order-2 mx-auto w-full max-w-[480px] pb-6 lg:col-span-6 lg:max-w-none lg:pb-0">
          <AfricaScene />
        </div>

        <div className="relative z-10 order-1 lg:col-span-6 lg:py-16">
          <p className="kicker mb-5 flex items-center gap-2.5 animate-rise">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-live" />
            </span>
            {t.hero.eyebrow}
          </p>

          <h1 className="display text-[clamp(2.9rem,10.5vw,7.4rem)] font-light">
            {words.map((w, i) => (
              <span key={i} className="block overflow-hidden pb-[0.06em]">
                <span className="block animate-rise" style={{ animationDelay: `${0.08 + i * 0.09}s` }}>{w}</span>
              </span>
            ))}
            <span className="block overflow-hidden pb-[0.06em]">
              <span className="block animate-rise" style={{ animationDelay: "0.26s" }}>
                <span className="italic text-sand">{t.hero.title3} </span>
                <span className="relative font-semibold text-ember not-italic">
                  {t.hero.live}
                  <span aria-hidden className="absolute -right-[0.32em] top-[0.12em] size-[0.17em] animate-blink rounded-full bg-live" />
                </span>
              </span>
            </span>
          </h1>

          <p className="mt-6 max-w-[34rem] text-base leading-relaxed text-sand sm:text-lg">{t.hero.lead}</p>

          {/* THE TWO ENTRY POINTS */}
          <div className="mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4">
            <Link
              href="/reserver?type=online"
              className="group relative flex min-h-[8.5rem] flex-col justify-between overflow-hidden rounded-[22px] bg-ember p-5 text-ink shadow-[0_24px_60px_-24px_rgb(210_105_42/0.9)] transition duration-500 ease-out-expo hover:-translate-y-1 hover:bg-ember-2"
            >
              <span className="flex items-start justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] opacity-70">01 · {t.liveType.onlineShort}</span>
                <span className="grid size-10 place-items-center rounded-full bg-ink text-ember transition duration-500 ease-out-expo group-hover:rotate-45">
                  <ArrowUpRight className="size-5" />
                </span>
              </span>
              <span>
                <span className="display block text-[2rem] font-semibold">{t.liveType.online}</span>
                <span className="mt-1 block text-sm font-medium opacity-75">{t.liveType.onlineHint}</span>
              </span>
            </Link>

            <Link
              href="/reserver?type=onsite"
              className="group relative flex min-h-[8.5rem] flex-col justify-between overflow-hidden rounded-[22px] border border-ivory/25 bg-ink-2/80 p-5 text-ivory backdrop-blur transition duration-500 ease-out-expo hover:-translate-y-1 hover:border-ivory/60"
            >
              <span className="flex items-start justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-gold">02 · {t.liveType.onsiteShort} · 6.13°N</span>
                <span className="grid size-10 place-items-center rounded-full bg-ivory text-ink transition duration-500 ease-out-expo group-hover:rotate-45">
                  <ArrowUpRight className="size-5" />
                </span>
              </span>
              <span>
                <span className="display block text-[2rem] font-semibold">
                  {t.liveType.onsite} <span className="italic text-ember">— {t.liveType.onsiteCity}</span>
                </span>
                <span className="mt-1 block text-sm font-medium text-sand">{t.liveType.onsiteHint}</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
