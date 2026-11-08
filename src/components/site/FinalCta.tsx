import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { CONTINENT, MAP_H, MAP_W } from "@/components/map/africa-geo";
import type { Dict } from "@/i18n";

export function FinalCta({ t }: { t: Dict }) {
  return (
    <section className="relative isolate overflow-hidden">
      <svg aria-hidden viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute -right-24 top-1/2 -z-10 w-[640px] -translate-y-1/2 opacity-[0.07] sm:right-0">
        <path d={CONTINENT} fill="none" stroke="#e0a458" strokeWidth="1.4" />
      </svg>
      <div className="mx-auto max-w-[1400px] px-4 py-28 sm:px-8 sm:py-44">
        <h2 className="display text-[clamp(3rem,11vw,9rem)] font-light">
          {t.final.title1}
          <br />
          <span className="italic text-ember">{t.final.title2}</span>
        </h2>
        <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-lg text-sand">{t.final.lead}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/reserver" className="btn btn-primary h-16 px-8 text-base">
              {t.final.cta} <ArrowUpRight className="size-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
