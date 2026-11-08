import { Download } from "lucide-react";
import Link from "next/link";

import { RequestFilters } from "@/components/admin/RequestFilters";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getDict } from "@/i18n/server";
import { formatDay, lomeTime } from "@/lib/time";
import { BOOKING_STATUSES } from "@/lib/types";
import { listRequests, PAGE_SIZE, readFilters } from "@/server/queries";
import { listPackages } from "@/server/settings";

export default async function Requests({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { locale, t } = await getDict();
  const sp = await searchParams;
  const f = readFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ items, total }, packages] = await Promise.all([listRequests(f, page), listPackages()]);
  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, page, ...over })) if (v !== undefined && v !== "" && !(k === "page" && v === 1)) p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const exportQs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tr = t.admin.requests;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-4xl sm:text-5xl">{tr.title}</h1>
          <p className="mt-2 text-sm text-sand">{tr.count(total)}</p>
        </div>
        <a href={`/admin/export${exportQs ? `?${exportQs}` : ""}`} className="btn btn-ghost h-10 min-h-10 text-sm"><Download className="size-4" /> {tr.export}</a>
      </div>

      {/* status tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {[undefined, ...BOOKING_STATUSES].map((s) => (
          <Link key={s ?? "all"} href={`/admin/demandes${qs({ status: s, page: 1 })}`} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 transition ${f.status === s ? "bg-ember text-on-ember ring-ember" : "text-sand ring-line-2 hover:text-ivory"}`}>
            {s ? t.status[s] : tr.all}
          </Link>
        ))}
      </div>

      <RequestFilters
        key={JSON.stringify(f)}
        initial={{ q: f.q ?? "", type: f.type ?? "", pkg: f.pkg ?? "", from: f.from ?? "", to: f.to ?? "" }}
        status={f.status}
        packages={packages.map((p) => ({ id: p.id, name: p.name[locale] }))}
      />

      {items.length === 0 ? (
        <p className="mt-10 text-center text-sand">{tr.empty}</p>
      ) : (
        <>
          {/* table on desktop */}
          <div className="card mt-6 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wider text-dust">
                <tr>{tr.cols.map((c) => <th key={c} className="px-4 py-3 font-semibold">{c}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((b) => {
                  const href = `/admin/demandes/${b._id.toHexString()}`;
                  return (
                    <tr key={href} className="transition hover:bg-ink-3/50">
                      <td className="px-4 py-3 font-mono font-bold"><Link href={href} className="text-ember-2 hover:underline">{b.reference}</Link></td>
                      <td className="px-4 py-3"><Link href={href} className="font-semibold text-ivory hover:underline">{b.business.name}</Link><span className="block text-xs text-dust">{b.contact.whatsapp}</span></td>
                      <td className="px-4 py-3 text-sand">{b.package.name[locale]}</td>
                      <td className="px-4 py-3 text-sand">{b.liveType === "online" ? t.liveType.onlineShort : t.liveType.onsiteShort}</td>
                      <td className="px-4 py-3 text-sand">{formatDay(b.day, locale, { day: "numeric", month: "short", year: "numeric" })} · {lomeTime(b.start)}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} label={t.status[b.status]} /></td>
                      <td className="px-4 py-3 text-dust">{b.createdAt.toISOString().slice(0, 10)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* cards on mobile */}
          <ul className="mt-6 grid gap-3 md:hidden">
            {items.map((b) => (
              <li key={b._id.toHexString()}>
                <Link href={`/admin/demandes/${b._id.toHexString()}`} className="card block p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-ember-2">{b.reference}</span>
                    <StatusBadge status={b.status} label={t.status[b.status]} />
                  </div>
                  <p className="mt-2 font-semibold text-ivory">{b.business.name}</p>
                  <p className="text-sm text-sand">{formatDay(b.day, locale, { day: "numeric", month: "short" })} · {lomeTime(b.start)} · {b.package.name[locale]} · {b.liveType === "online" ? t.liveType.onlineShort : t.liveType.onsiteShort}</p>
                </Link>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              {page > 1 && <Link href={`/admin/demandes${qs({ page: page - 1 })}`} className="btn btn-ghost h-10 min-h-10">{tr.prev}</Link>}
              <span className="text-sand">{page} / {pages}</span>
              {page < pages && <Link href={`/admin/demandes${qs({ page: page + 1 })}`} className="btn btn-ghost h-10 min-h-10">{tr.next}</Link>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
