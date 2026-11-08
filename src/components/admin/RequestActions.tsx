"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { moveAction, noteAction, statusAction, type FormState } from "@/app/admin/actions";
import { Calendar } from "@/components/flow/Calendar";
import { useI18n } from "@/i18n/client";
import type { BookingStatus } from "@/lib/types";

function useMsg(state: FormState) {
  const { t } = useI18n();
  if (!state?.error) return null;
  return (t.admin.detail as Record<string, unknown>)[state.error] as string ?? state.error;
}

/** Validate / Reject / Cancel — each confirmed in a small dialog. Disabled while sending (no double click). */
export function StatusActions({ id, status }: { id: string; status: BookingStatus }) {
  const { t } = useI18n();
  const d = t.admin.detail;
  const [open, setOpen] = useState<null | "validated" | "rejected" | "cancelled">(null);
  const [state, action, pending] = useActionState(statusAction, undefined);
  const dialog = useRef<HTMLDialogElement>(null);
  const msg = useMsg(state);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close the dialog once the action succeeded
    if (state?.ok) setOpen(null);
  }, [state]);

  if (status === "rejected" || status === "cancelled") return null;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "pending" && <button type="button" onClick={() => setOpen("validated")} className="btn h-11 min-h-11 bg-ok text-ink hover:brightness-110">{d.validate}</button>}
        {status === "pending" && <button type="button" onClick={() => setOpen("rejected")} className="btn btn-ghost h-11 min-h-11 border-bad/50 text-bad">{d.reject}</button>}
        <button type="button" onClick={() => setOpen("cancelled")} className="btn btn-ghost h-11 min-h-11 text-sand">{d.cancel}</button>
      </div>
      {msg && <p role="alert" className="error mt-2">{msg}</p>}
      <dialog ref={dialog} onClose={() => setOpen(null)} className="m-auto w-[min(92vw,28rem)] rounded-3xl border border-line-2 bg-ink-2 p-0 text-ivory backdrop:bg-black/70 backdrop:backdrop-blur-sm">
        {open && (
          <form action={action} className="grid gap-4 p-6">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="to" value={open} />
            <h2 className="display text-3xl">{open === "validated" ? d.validate : open === "rejected" ? d.reject : d.cancel}</h2>
            {open !== "validated" && (
              <label className="field">
                <span className="label">{open === "rejected" ? d.reason : d.cancelReason}</span>
                <textarea name="reason" rows={3} maxLength={1000} className="input" required={open === "rejected"} />
              </label>
            )}
            <p className="text-xs text-dust">{d.mailNote}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(null)} className="btn btn-ghost h-11 min-h-11">{d.close}</button>
              <button disabled={pending} className={`btn h-11 min-h-11 ${open === "validated" ? "bg-ok text-ink" : "bg-bad text-ink"}`}>
                {pending && <LoaderCircle className="size-4 animate-spin" />} {d.confirm}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

export function MoveBooking({ id }: { id: string }) {
  const { t } = useI18n();
  const d = t.admin.detail;
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<Record<string, string[]> | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [state, action, pending] = useActionState(moveAction, undefined);
  const dialog = useRef<HTMLDialogElement>(null);
  const msg = useMsg(state);

  useEffect(() => {
    if (!open) {
      dialog.current?.close();
      return;
    }
    dialog.current?.showModal();
    fetch(`/admin/availability?id=${id}`, { cache: "no-store" }).then((r) => r.json()).then((j) => setDays(j.days ?? {})).catch(() => setDays({}));
  }, [open, id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close once moved
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <>
      <button type="button" onClick={() => { setDays(null); setDay(null); setTime(null); setOpen(true); }} className="btn btn-ghost h-11 min-h-11">{d.move}</button>
      <dialog ref={dialog} onClose={() => setOpen(false)} className="m-auto w-[min(94vw,36rem)] rounded-3xl border border-line-2 bg-ink-2 p-0 text-ivory backdrop:bg-black/70 backdrop:backdrop-blur-sm">
        {open && (
          <form action={action} className="grid max-h-[90dvh] gap-4 overflow-y-auto p-5 sm:p-6">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="day" value={day ?? ""} />
            <input type="hidden" name="time" value={time ?? ""} />
            <h2 className="display text-3xl">{d.moveTitle}</h2>
            {!days ? (
              <p className="flex items-center gap-2 text-sand"><LoaderCircle className="size-4 animate-spin" /> {t.flow.date.loading}</p>
            ) : Object.keys(days).length === 0 ? (
              <p className="text-sand">{t.flow.date.none}</p>
            ) : (
              <>
                <Calendar available={days} value={day} onChange={(v) => { setDay(v); setTime(null); }} />
                {day && (
                  <div className="grid grid-cols-4 gap-2">
                    {(days[day] ?? []).map((x) => (
                      <button key={x} type="button" aria-pressed={time === x} onClick={() => setTime(x)} className={`rounded-xl border py-2.5 text-sm font-bold ${time === x ? "border-ember bg-ember text-ink" : "border-line text-ivory hover:border-line-2"}`}>{x}</button>
                    ))}
                  </div>
                )}
              </>
            )}
            {msg && <p role="alert" className="error">{msg}</p>}
            <p className="text-xs text-dust">{d.mailNote}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost h-11 min-h-11">{d.close}</button>
              <button disabled={!day || !time || pending} className="btn btn-primary h-11 min-h-11">{pending && <LoaderCircle className="size-4 animate-spin" />} {d.confirm}</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}

export function NoteForm({ id }: { id: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(noteAction, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <textarea name="text" rows={2} maxLength={2000} required placeholder={t.admin.detail.notePlaceholder} className="input" />
      <button disabled={pending} className="btn btn-ghost h-10 min-h-10 justify-self-end text-sm">{t.admin.detail.addNote}</button>
    </form>
  );
}
