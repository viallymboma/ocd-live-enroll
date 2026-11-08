import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { getDict } from "@/i18n/server";
import { addDays, formatDay, formatMoney, lomeDay, lomeTime, weekday } from "@/lib/time";
import { getRules } from "@/server/settings";
import { overview } from "@/server/queries";

function mondayOf(day: string) {
  return addDays(day, -((weekday(day) + 6) % 7));
}

export default async function Overview({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { locale, t } = await getDict();
  const sp = await searchParams;
  const weekStart = mondayOf(sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : lomeDay(new Date()));
  const [o, rules] = await Promise.all([overview(weekStart), getRules()]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = lomeDay(new Date());

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="display text-4xl sm:text-5xl">{t.admin.nav.overview}</h1>
      {!rules.currencyConfirmed && (
        <p className="mt-4 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
          {t.admin.schedule.currencyWarn} <Link href="/admin/planning" className="underline">{t.admin.nav.schedule} →</Link>
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/demandes?status=pending" className="card group p-6 transition hover:border-gold/50">
          <p className="kicker">{t.admin.overview.pending}</p>
          <p className="display mt-3 text-6xl text-gold">{o.pending}</p>
        </Link>
        <div className="card p-6">
          <p className="kicker">{t.admin.overview.validatedMonth}</p>
          <p className="display mt-3 text-6xl text-ok">{o.validatedCount}</p>
        </div>
        <div className="card p-6">
          <p className="kicker">{t.admin.overview.revenueMonth}</p>
          <p className="display mt-3 text-4xl text-ivory">{formatMoney(o.revenue, o.currency ?? rules.currency, locale)}</p>
          <p className="mt-2 text-xs text-dust">{t.admin.overview.priceTbcNote}</p>
        </div>
      </div>

      {/* week calendar */}
      <section className="card mt-8 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t.admin.overview.week}</h2>
          <div className="flex items-center gap-2">
            <Link href={`/admin?week=${addDays(weekStart, -7)}`} aria-label={t.admin.overview.prevWeek} className="grid size-9 place-items-center rounded-full border border-line-2 text-sand hover:text-ivory"><ChevronLeft className="size-4" /></Link>
            <span className="text-sm text-sand">{formatDay(weekStart, locale, { day: "numeric", month: "short" })} – {formatDay(addDays(weekStart, 6), locale, { day: "numeric", month: "short" })}</span>
            <Link href={`/admin?week=${addDays(weekStart, 7)}`} aria-label={t.admin.overview.nextWeek} className="grid size-9 place-items-center rounded-full border border-line-2 text-sand hover:text-ivory"><ChevronRight className="size-4" /></Link>
          </div>
        </div>
        <div className="mt-4 grid gap-2 overflow-x-auto sm:grid-cols-7">
          {days.map((d) => {
            const items = o.week.filter((b) => b.day === d);
            return (
              <div key={d} className={`min-h-28 rounded-xl border p-2 ${d === today ? "border-ember/60 bg-ember/5" : "border-line"}`}>
                <p className="text-xs font-bold capitalize text-sand">{formatDay(d, locale, { weekday: "short", day: "numeric" })}</p>
                <div className="mt-2 grid gap-1.5">
                  {items.map((b) => (
                    <Link key={b._id.toHexString()} href={`/admin/demandes/${b._id.toHexString()}`} className={`block rounded-lg px-2 py-1.5 text-[11px] leading-tight ring-1 transition hover:brightness-125 ${b.status === "validated" ? "bg-ok/10 ring-ok/30" : "bg-gold/10 ring-gold/30"}`}>
                      <span className="font-bold text-ivory">{lomeTime(b.start)}–{lomeTime(b.end)}</span>
                      <span className="block truncate text-sand">{b.business.name}</span>
                      <span className="text-dust">{b.liveType === "online" ? t.liveType.onlineShort : t.liveType.onsiteShort}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card mt-8 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t.admin.overview.upcoming}</h2>
          <Link href="/admin/demandes" className="text-sm font-semibold text-ember-2 hover:underline">{t.admin.overview.seeAll} →</Link>
        </div>
        {o.upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-dust">{t.admin.overview.noUpcoming}</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {o.upcoming.map((b) => (
              <li key={b._id.toHexString()}>
                <Link href={`/admin/demandes/${b._id.toHexString()}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-ink-3/40">
                  <span>
                    <span className="font-semibold text-ivory">{b.business.name}</span>
                    <span className="block text-sm text-sand">{formatDay(b.day, locale, { weekday: "short", day: "numeric", month: "short" })} · {lomeTime(b.start)} · {b.package.name[locale]} · {b.liveType === "online" ? t.liveType.onlineShort : t.liveType.onsiteShort}</span>
                  </span>
                  <StatusBadge status={b.status} label={t.status[b.status]} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
