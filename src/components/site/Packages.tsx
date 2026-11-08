import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PackagesFx } from "@/components/fx/PackagesFx";
import type { Dict } from "@/i18n";
import { formatDuration, formatMoney } from "@/lib/time";
import type { Locale, PackageDTO } from "@/lib/types";

/**
 * Packages as a DURATION RULER: each row's bar is drawn to scale against the
 * longest package, so the difference between offers reads at a glance.
 * Placeholder content is labelled as such — nothing is presented as confirmed.
 */
export function Packages({ t, locale, packages, currency }: { t: Dict; locale: Locale; packages: PackageDTO[]; currency: string }) {
  const max = Math.max(...packages.map((p) => p.durationMinutes), 60);
  const hours = Math.ceil(max / 60);
  return (
    <section id="packages" className="relative scroll-mt-10 border-y border-line bg-ink-2/40">
      <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-8 sm:py-36">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="kicker mb-4">{t.packages.kicker}</p>
            <h2 className="display text-[clamp(2.4rem,6vw,4.8rem)] font-light">{t.packages.title}</h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-sand lg:col-span-5 lg:justify-self-end">{t.packages.lead}</p>
        </div>

        {packages.length === 0 ? (
          <p className="mt-16 text-sand">{t.packages.empty}</p>
        ) : (
          <PackagesFx locale={locale}>
            {/* hour scale */}
            <div aria-hidden className="mt-16 hidden grid-cols-12 gap-6 text-[10px] font-bold tracking-widest text-dust md:grid">
              <span className="col-span-4" />
              <div className="relative col-span-5 h-4">
                {Array.from({ length: hours + 1 }, (_, h) => (
                  <span key={h} className="absolute -translate-x-1/2" style={{ left: `${((h * 60) / max) * 100}%` }}>
                    {h}H
                  </span>
                ))}
              </div>
            </div>
            <ul className="mt-6 divide-y divide-line border-y border-line md:mt-3">
              {packages.map((p, i) => {
                const href = `/reserver?package=${p.id}${p.liveTypes.length === 1 ? `&type=${p.liveTypes[0]}` : ""}`;
                const pct = (p.durationMinutes / max) * 100;
                return (
                  <li key={p.id} data-pkg-row className="group relative">
                    <Link href={href} className="grid gap-4 py-7 transition-colors duration-300 hover:bg-ink-3/40 md:grid-cols-12 md:items-center md:gap-6 md:px-4">
                      <div className="flex items-baseline gap-4 md:col-span-4">
                        <span className="text-xs font-bold text-dust">{String(i + 1).padStart(2, "0")}</span>
                        <div>
                          <h3 className="display text-3xl font-normal text-ivory transition-colors group-hover:text-ember-2 sm:text-4xl">{p.name[locale]}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-line-2 px-2.5 py-0.5 text-[11px] font-semibold text-sand">
                              {p.liveTypes.length === 2 ? t.packages.both : p.liveTypes[0] === "online" ? t.liveType.onlineShort : t.liveType.onsiteShort}
                            </span>
                            {p.placeholder && <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold">{t.packages.tbcBadge}</span>}
                          </div>
                        </div>
                      </div>

                      {/* the ruler */}
                      <div className="md:col-span-5">
                        <div className="relative h-11 overflow-hidden rounded-full border border-line bg-ink">
                          {/* drawn to true scale; short packages carry their label outside the bar */}
                          <div
                            data-bar
                            className="absolute inset-y-0 left-0 flex items-center justify-end rounded-full bg-gradient-to-r from-ember-deep via-ember to-ember-2 pr-4 transition-[filter] duration-500 group-hover:brightness-110"
                            style={{ width: `${pct}%` }}
                          >
                            {pct >= 30 && <span className="text-sm font-extrabold text-ink">{formatDuration(p.durationMinutes, locale)}</span>}
                          </div>
                          {pct < 30 && (
                            <span className="absolute inset-y-0 flex items-center pl-3 text-sm font-extrabold text-ivory" style={{ left: `${pct}%` }}>
                              {formatDuration(p.durationMinutes, locale)}
                            </span>
                          )}
                        </div>
                        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sand">
                          {p.deliverables[locale].map((d) => (
                            <li key={d} className="before:mr-2 before:text-gold before:content-['✦']">{d}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between gap-4 md:col-span-3 md:justify-end">
                        <span data-count={p.price || undefined} className={p.price > 0 ? "display text-3xl tabular-nums text-ivory" : "text-sm font-semibold text-gold"}>
                          {p.price > 0 ? formatMoney(p.price, currency, locale) : t.packages.priceTbc}
                        </span>
                        <span className="grid size-12 shrink-0 place-items-center rounded-full border border-line-2 text-ivory transition duration-500 ease-out-expo group-hover:border-ember group-hover:bg-ember group-hover:text-ink">
                          <ArrowRight className="size-5" aria-hidden />
                          <span className="sr-only">{t.packages.choose}</span>
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </PackagesFx>
        )}
      </div>
    </section>
  );
}
