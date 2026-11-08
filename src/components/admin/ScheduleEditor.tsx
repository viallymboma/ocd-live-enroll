"use client";

import { useActionState, useState } from "react";

import { scheduleAction } from "@/app/admin/actions";
import { useI18n } from "@/i18n/client";
import { LIVE_TYPES, type ClosedDay, type ScheduleRules } from "@/lib/types";

export function ScheduleEditor({ rules }: { rules: ScheduleRules }) {
  const { t } = useI18n();
  const s = t.admin.schedule;
  const [state, action, pending] = useActionState(scheduleAction, undefined);
  const [closed, setClosed] = useState<ClosedDay[]>(rules.closedDays);
  const order = [1, 2, 3, 4, 5, 6, 0]; // Monday first

  return (
    <form action={action} className="grid gap-6">
      {!rules.currencyConfirmed && <p className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">{s.currencyWarn}</p>}

      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-gold">{s.hours}</h2>
        <div className="grid gap-8 lg:grid-cols-2">
          {LIVE_TYPES.map((lt) => (
            <fieldset key={lt}>
              <legend className="mb-3 font-bold">{lt === "online" ? t.liveType.online : `${t.liveType.onsite} — ${t.liveType.onsiteCity}`}</legend>
              <div className="grid gap-2">
                {order.map((d) => {
                  const h = rules.hours[lt][d];
                  return (
                    <div key={d} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm sm:grid-cols-[7.5rem_auto_auto]">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name={`${lt}_${d}_on`} defaultChecked={!!h} className="size-4 accent-[#d2692a]" />
                        {s.days[d]}
                      </label>
                      <input type="time" name={`${lt}_${d}_open`} defaultValue={h?.open ?? "09:00"} aria-label={`${s.days[d]} ${s.open}`} className="input min-h-10 w-[8.5rem] px-3 py-1.5" />
                      <input type="time" name={`${lt}_${d}_close`} defaultValue={h?.close ?? "18:00"} aria-label={`${s.days[d]} ${s.close}`} className="input min-h-10 w-[8.5rem] px-3 py-1.5" />
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-gold">{s.rules}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="field"><span className="label">{s.gap}</span><input name="gap" type="number" min={0} max={240} step={5} defaultValue={rules.gapMinutes} className="input" /></label>
          <label className="field"><span className="label">{s.capacity}</span><input name="capacity" type="number" min={1} max={20} defaultValue={rules.capacity} className="input" /></label>
          <label className="field"><span className="label">{s.step}</span>
            <select name="step" defaultValue={rules.stepMinutes} className="input"><option value={15}>15</option><option value={30}>30</option><option value={60}>60</option></select>
          </label>
          <label className="field"><span className="label">{s.window}</span><input name="window" type="number" min={7} max={365} defaultValue={rules.bookingWindowDays} className="input" /></label>
          <label className="field"><span className="label">{s.notice}</span><input name="notice" type="number" min={0} max={336} defaultValue={rules.minNoticeHours} className="input" /></label>
          <div className="field">
            <label className="label" htmlFor="currency">{s.currency}</label>
            <input id="currency" name="currency" defaultValue={rules.currency} maxLength={3} className="input uppercase" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="currencyConfirmed" defaultChecked={rules.currencyConfirmed} className="size-4 accent-[#d2692a]" /> {s.currencyConfirmed}</label>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-gold">{s.closedDays}</h2>
          <button type="button" onClick={() => setClosed((c) => [...c, { date: "", liveType: "both", note: "" }])} className="btn btn-ghost h-9 min-h-9 text-sm">+ {s.addClosed}</button>
        </div>
        <div className="grid gap-2">
          {closed.map((c, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[10rem_10rem_1fr_auto]">
              <input type="date" name="closed_date" defaultValue={c.date} aria-label={s.date} className="input min-h-10 py-1.5" />
              <select name="closed_type" defaultValue={c.liveType} aria-label={s.appliesTo} className="input min-h-10 py-1.5">
                <option value="both">{s.both}</option>
                <option value="online">{t.liveType.online}</option>
                <option value="onsite">{t.liveType.onsite}</option>
              </select>
              <input name="closed_note" defaultValue={c.note} placeholder={s.note} maxLength={120} className="input min-h-10 py-1.5" />
              <button type="button" onClick={() => setClosed((all) => all.filter((_, j) => j !== i))} className="btn btn-ghost h-10 min-h-10 text-sm">{s.remove}</button>
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border border-line bg-ink-2/95 p-3 backdrop-blur">
        {state?.ok && <span role="status" className="text-sm text-ok">{s.saved}</span>}
        {state?.error && <span role="alert" className="error">{s.invalid}</span>}
        <button disabled={pending} className="btn btn-primary">{s.save}</button>
      </div>
    </form>
  );
}
