import { PackagesRail, type RailCard } from "@/components/fx/PackagesRail";
import type { Dict } from "@/i18n";
import { formatDuration, formatMoney } from "@/lib/time";
import type { Locale, PackageDTO } from "@/lib/types";

/**
 * Packages: a pinned 3D carousel driven by the scroll (see PackagesRail).
 * Each card's duration bar is drawn to scale against the longest package.
 * Placeholder content is labelled as such — nothing is presented as confirmed.
 */
export function Packages({ t, locale, packages, currency }: { t: Dict; locale: Locale; packages: PackageDTO[]; currency: string }) {
  const max = Math.max(...packages.map((p) => p.durationMinutes), 60);
  const header = (
    <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-7">
        <p className="kicker mb-3">{t.packages.kicker}</p>
        <h2 className="display text-[clamp(2.2rem,5.5vw,4.4rem)] font-light">{t.packages.title}</h2>
      </div>
      <p className="max-w-md text-base leading-relaxed text-sand lg:col-span-5 lg:justify-self-end">{t.packages.lead}</p>
    </div>
  );

  if (packages.length === 0) {
    return (
      <section id="packages" className="relative scroll-mt-10 border-y border-line bg-ink-2/40">
        <div className="mx-auto max-w-[1400px] px-4 py-24 sm:px-8 sm:py-36">
          {header}
          <p className="mt-16 text-sand">{t.packages.empty}</p>
        </div>
      </section>
    );
  }

  const cards: RailCard[] = packages.map((p) => ({
    id: p.id,
    href: `/reserver?package=${p.id}${p.liveTypes.length === 1 ? `&type=${p.liveTypes[0]}` : ""}`,
    name: p.name[locale],
    description: p.description[locale],
    duration: formatDuration(p.durationMinutes, locale),
    ratio: p.durationMinutes / max,
    hours: Math.ceil(max / 60),
    types: p.liveTypes.length === 2 ? t.packages.both : p.liveTypes[0] === "online" ? t.liveType.onlineShort : t.liveType.onsiteShort,
    tbc: p.placeholder,
    price: p.price > 0 ? formatMoney(p.price, currency, locale) : t.packages.priceTbc,
    priceTbc: !(p.price > 0),
    deliverables: p.deliverables[locale],
  }));

  return <PackagesRail header={header} cards={cards} labels={{ choose: t.packages.choose, tbc: t.packages.tbcBadge, scroll: t.packages.scroll }} />;
}
