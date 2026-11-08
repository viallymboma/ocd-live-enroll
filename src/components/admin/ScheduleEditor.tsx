"use client";

import { Globe, MapPin, Plus, Trash2 } from "lucide-react";
import { useActionState, useId, useState } from "react";

import { scheduleAction } from "@/app/admin/actions";
import { FieldLabel } from "@/components/flow/fields";
import { DateField } from "@/components/ui/DateField";
import { SelectField } from "@/components/ui/SelectField";
import { useI18n } from "@/i18n/client";
import { LIVE_TYPES, type ClosedDay, type DayHours, type LiveType, type ScheduleRules } from "@/lib/types";

/** Every half hour, 00:00 → 24:00 (24:00 = midnight, end of day). */
const TIMES = Array.from({ length: 49 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

/**
 * Planning: opening hours per live type, booking rules, closed days.
 * Responsive: on phones each day is a block (switch + day, then the two times side by side);
 * from `sm` it is one line. All pickers are the app's own (bottom sheets on phones).
 */
export function ScheduleEditor({ rules }: { rules: ScheduleRules }) {
  const { t } = useI18n();
  const s = t.admin.schedule;
  const [state, action, pending] = useActionState(scheduleAction, undefined);
  const [hours, setHours] = useState<Record<LiveType, { on: boolean; open: string; close: string }[]>>(() =>
    Object.fromEntries(LIVE_TYPES.map((lt) => [lt, rules.hours[lt].map((h: DayHours) => ({ on: Boolean(h), open: h?.open ?? "09:00", close: h?.close ?? "18:00" }))])) as Record<LiveType, { on: boolean; open: string; close: string }[]>,
  );
  const [closed, setClosed] = useState<(ClosedDay & { key: number })[]>(() => rules.closedDays.map((c, i) => ({ ...c, key: i })));
  const [step, setStep] = useState(String(rules.stepMinutes));
  const timeOptions = TIMES.map((v) => ({ value: v, label: v }));
  const setDay = (lt: LiveType, d: number, patch: Partial<{ on: boolean; open: string; close: string }>) =>
    setHours((h) => ({ ...h, [lt]: h[lt].map((x, i) => (i === d ? { ...x, ...patch } : x)) }));

  return (
    <form action={action} className="grid gap-6 pb-4">
      {!rules.currencyConfirmed && <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{s.currencyWarn}</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        {LIVE_TYPES.map((lt) => (
          <section key={lt} className="card p-4 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2.5 font-bold text-ivory">
              {lt === "online" ? <Globe className="size-4 text-gold" /> : <MapPin className="size-4 text-gold" />}
              {lt === "online" ? t.liveType.online : `${t.liveType.onsite} — ${t.liveType.onsiteCity}`}
            </h2>
            <p className="mb-4 text-xs text-dust">{s.hours}</p>
            <ul className="divide-y divide-line">
              {ORDER.map((d) => {
                const h = hours[lt][d];
                return (
                  <li key={d} className="grid gap-2 py-3 sm:grid-cols-[9.5rem_1fr] sm:items-center sm:gap-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" name={`${lt}_${d}_on`} checked={h.on} onChange={(e) => setDay(lt, d, { on: e.target.checked })} className="peer sr-only" />
                      <span aria-hidden className="relative h-6 w-10 shrink-0 rounded-full bg-line-2 transition peer-checked:bg-ember peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
                      <span className={`text-sm font-semibold ${h.on ? "text-ivory" : "text-dust"}`}>{s.days[d]}</span>
                    </label>
                    {h.on ? (
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <SelectField label={`${s.days[d]} — ${s.open}`} sheetTitle={`${s.days[d]} · ${s.open}`} hideLabel required name={`${lt}_${d}_open`} value={h.open} onChange={(v) => setDay(lt, d, { open: v, ...(h.close <= v ? { close: TIMES[Math.min(TIMES.indexOf(v) + 2, TIMES.length - 1)] } : {}) })} options={timeOptions.slice(0, -1)} searchThreshold={99} />
                        <span aria-hidden className="text-dust">–</span>
                        <SelectField label={`${s.days[d]} — ${s.close}`} sheetTitle={`${s.days[d]} · ${s.close}`} hideLabel required name={`${lt}_${d}_close`} value={h.close} onChange={(v) => setDay(lt, d, { close: v })} options={timeOptions.filter((o) => o.value > h.open)} searchThreshold={99} />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-dust sm:pl-0">{s.closed}</p>
                        <input type="hidden" name={`${lt}_${d}_open`} value={h.open} />
                        <input type="hidden" name={`${lt}_${d}_close`} value={h.close} />
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section className="card p-4 sm:p-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-gold">{s.rules}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumField label={s.gap} name="gap" min={0} max={240} step={5} defaultValue={rules.gapMinutes} />
          <NumField label={s.capacity} name="capacity" min={1} max={20} defaultValue={rules.capacity} />
          <SelectField label={s.step} required name="step" value={step} onChange={setStep} options={[15, 30, 60].map((n) => ({ value: String(n), label: `${n} min` }))} searchThreshold={99} />
          <NumField label={s.window} name="window" min={7} max={365} defaultValue={rules.bookingWindowDays} />
          <NumField label={s.notice} name="notice" min={0} max={336} defaultValue={rules.minNoticeHours} />
          <div className="field">
            <FieldLabel htmlFor="currency" label={s.currency} />
            <input id="currency" name="currency" defaultValue={rules.currency} maxLength={3} className="input uppercase" />
            <label className="mt-1 flex items-center gap-2 text-sm text-sand"><input type="checkbox" name="currencyConfirmed" defaultChecked={rules.currencyConfirmed} className="size-4 accent-[#d2692a]" /> {s.currencyConfirmed}</label>
          </div>
        </div>
      </section>

      <section className="card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{s.closedDays}</h2>
          <button type="button" onClick={() => setClosed((c) => [...c, { date: "", liveType: "both", note: "", key: Date.now() }])} className="btn btn-ghost h-10 min-h-10 shrink-0 px-4 text-sm"><Plus className="size-4" /> {s.addClosed}</button>
        </div>
        {closed.length === 0 && <p className="text-sm text-dust">{s.noClosed}</p>}
        <ul className="grid gap-3">
          {closed.map((c, i) => (
            <li key={c.key} className="grid gap-3 rounded-2xl border border-line p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end sm:border-0 sm:p-0">
              <DateField label={s.date} name="closed_date" value={c.date} onChange={(v) => setClosed((all) => all.map((x, j) => (j === i ? { ...x, date: v } : x)))} />
              <SelectField label={s.appliesTo} required name="closed_type" value={c.liveType} onChange={(v) => setClosed((all) => all.map((x, j) => (j === i ? { ...x, liveType: v as ClosedDay["liveType"] } : x)))} options={[{ value: "both", label: s.both }, { value: "online", label: t.liveType.online }, { value: "onsite", label: t.liveType.onsite }]} searchThreshold={99} />
              <NoteField label={s.note} value={c.note} onChange={(v) => setClosed((all) => all.map((x, j) => (j === i ? { ...x, note: v } : x)))} />
              <button type="button" onClick={() => setClosed((all) => all.filter((_, j) => j !== i))} aria-label={s.remove} className="grid h-[3.1rem] w-full place-items-center rounded-[14px] border border-bad/40 text-bad hover:bg-bad/10 sm:w-[3.1rem]">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-ink-2/95 p-3 shadow-[var(--shadow)] backdrop-blur">
        {state?.ok && <span role="status" className="mr-auto text-sm font-semibold text-ok">{s.saved}</span>}
        {state?.error && <span role="alert" className="error mr-auto">{s.invalid}</span>}
        <button disabled={pending} className="btn btn-primary w-full sm:w-auto">{s.save}</button>
      </div>
    </form>
  );
}

function NumField({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={label} />
      <input id={id} name={name} type="number" inputMode="numeric" className="input tabular-nums" {...rest} />
    </div>
  );
}

function NoteField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={label} />
      <input id={id} name="closed_note" value={value} onChange={(e) => onChange(e.target.value)} maxLength={120} className="input" />
    </div>
  );
}
