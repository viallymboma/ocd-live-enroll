"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { DateField } from "@/components/ui/DateField";
import { SelectField } from "@/components/ui/SelectField";
import { useI18n } from "@/i18n/client";

type F = { q: string; type: string; pkg: string; from: string; to: string };

/**
 * Requests filters. Wide screens (≥1280 px): one row (search, live type, package, date range).
 * Phone: the search stays visible; the rest opens in a BOTTOM SHEET behind "Filters (n)".
 * Selects and the date range are the app's own (bottom sheets on phones) — no native pickers.
 */
export function RequestFilters({ initial, status, packages }: { initial: F; status?: string; packages: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const tr = t.admin.requests;
  const router = useRouter();
  const [f, setF] = useState<F>(initial);
  const [sheet, setSheet] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof F) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  const go = (next: F) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    start(() => router.push(`/admin/demandes${s ? `?${s}` : ""}`));
  };
  const reset = () => {
    const empty = { q: "", type: "", pkg: "", from: "", to: "" };
    setF(empty);
    setSheet(false);
    go(empty);
  };
  const active = [initial.type, initial.pkg, initial.from || initial.to].filter(Boolean).length;

  const typeOptions = [
    { value: "online", label: t.liveType.online },
    { value: "onsite", label: `${t.liveType.onsite} — ${t.liveType.onsiteCity}` },
  ];
  const pkgOptions = packages.map((p) => ({ value: p.id, label: p.name }));

  const fields = (inSheet: boolean) => (
    <>
      <SelectField label={t.flow.review.live} hideLabel={!inSheet} value={f.type} onChange={set("type")} options={typeOptions} placeholder={tr.allTypes} searchThreshold={99} />
      <SelectField label={t.flow.steps[1]} hideLabel={!inSheet} value={f.pkg} onChange={set("pkg")} options={pkgOptions} placeholder={tr.allPackages} searchThreshold={99} />
      <DateField mode="range" label={tr.period} hideLabel={!inSheet} from={f.from} to={f.to} onChange={(from, to) => setF((x) => ({ ...x, from, to }))} />
    </>
  );

  const search = (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{tr.search}</span>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dust" />
      <input type="search" value={f.q} onChange={(e) => set("q")(e.target.value)} placeholder={tr.search} className="input pl-10" enterKeyHint="search" />
    </label>
  );

  return (
    <>
      {/* desktop */}
      <form onSubmit={(e) => { e.preventDefault(); go(f); }} className="card mt-4 hidden items-start gap-3 p-4 xl:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto]">
        {search}
        {fields(false)}
        <div className="flex gap-2">
          <button disabled={pending} className="btn btn-primary h-[3.1rem]">{tr.filter}</button>
          <button type="button" onClick={reset} className="btn btn-ghost h-[3.1rem]">{tr.reset}</button>
        </div>
      </form>

      {/* phone / tablet */}
      <form onSubmit={(e) => { e.preventDefault(); go(f); }} className="mt-4 flex gap-2 xl:hidden">
        {search}
        <button type="button" onClick={() => setSheet(true)} aria-label={tr.filters} className="relative inline-flex h-[3.1rem] shrink-0 items-center gap-2 rounded-[14px] border border-line bg-ink-2 px-4 text-sm font-semibold text-ivory">
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">{tr.filters}</span>
          {active > 0 && <span className="grid size-5 place-items-center rounded-full bg-ember text-[11px] font-extrabold text-on-ember">{active}</span>}
        </button>
      </form>
      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={tr.filters}
        closeLabel={t.ui.close}
        footer={
          <div className="flex gap-3">
            <button type="button" onClick={reset} className="btn btn-ghost flex-1">{tr.reset}</button>
            <button type="button" onClick={() => { setSheet(false); go(f); }} className="btn btn-primary flex-1">{tr.apply}</button>
          </div>
        }
      >
        <div className="grid gap-5">{fields(true)}</div>
      </BottomSheet>
    </>
  );
}
