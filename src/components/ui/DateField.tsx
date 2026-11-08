"use client";

import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { FieldLabel } from "@/components/flow/fields";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useI18n } from "@/i18n/client";
import { addDays } from "@/lib/time";
import { BottomSheet } from "./BottomSheet";

/**
 * THE date input of the app (replaces every native `type="date"`, as habesha's DateField does).
 * Phone: the calendar opens in a BOTTOM SHEET with big day cells. Wide screen: a popover under
 * the field (flips up when there is no room). ISO "YYYY-MM-DD" in and out — never a Date, so no
 * time-zone off-by-one. `name` (or `names` for a range) renders hidden inputs for plain forms.
 *
 * mode="range": first tap = start, second tap = end (an earlier second tap restarts the range),
 * with quick presets. Days outside min/max are not offered at all.
 */
type Common = { label: string; hideLabel?: boolean; required?: boolean; error?: string; hint?: string; min?: string; max?: string; placeholder?: string; className?: string };
type Single = Common & { mode?: "single"; value: string; onChange: (v: string) => void; name?: string };
type Range = Common & { mode: "range"; from: string; to: string; onChange: (from: string, to: string) => void; names?: [string, string]; presets?: boolean };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function DateField(props: Single | Range) {
  const { locale, t } = useI18n();
  const id = useId();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const range = props.mode === "range";
  // While picking a range, the first tap is held here until the second one.
  const [pendingStart, setPendingStart] = useState<string | null>(null);

  const fmt = (iso: string, short = false) =>
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", short ? { day: "numeric", month: "short", timeZone: "UTC" } : { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

  const text = range
    ? props.from || props.to
      ? `${props.from ? fmt(props.from, true) : "…"} → ${props.to ? fmt(props.to, props.from?.slice(0, 4) === props.to?.slice(0, 4)) : "…"}`
      : ""
    : props.value
      ? fmt(props.value)
      : "";
  const hasValue = range ? Boolean(props.from || props.to) : Boolean(props.value);

  const close = () => {
    setOpen(false);
    setPendingStart(null);
  };
  const clear = () => {
    if (range) props.onChange("", "");
    else props.onChange("");
  };
  const pick = (day: string) => {
    if (!range) {
      props.onChange(day);
      close();
      trigger.current?.focus();
      return;
    }
    if (!pendingStart) {
      setPendingStart(day);
      props.onChange(day, "");
      return;
    }
    const [a, b] = day < pendingStart ? [day, pendingStart] : [pendingStart, day];
    props.onChange(a, b);
    close();
    trigger.current?.focus();
  };

  // Desktop popover: place under (or above) the field; close on outside click / Escape.
  useEffect(() => {
    if (!open || isMobile || !trigger.current) return;
    const r = trigger.current.getBoundingClientRect();
    const h = range ? 470 : 400;
    const up = window.innerHeight - r.bottom < h && r.top > h;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measured placement on open
    setPlace({ left: Math.min(r.left, window.innerWidth - 336), ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
    const down = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!trigger.current?.contains(n) && !pop.current?.contains(n)) close();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, isMobile, range]);

  const errText = props.error;
  const grid = (
    <MonthGrid
      selected={range ? { from: pendingStart ?? props.from, to: pendingStart ? "" : props.to } : { from: props.value, to: props.value }}
      min={props.min}
      max={props.max}
      onPick={pick}
      big={isMobile}
    />
  );
  const presets = range && props.presets !== false && (
    <div className="flex flex-wrap gap-2">
      {presetRanges().map((p) => (
        <button key={p.key} type="button" onClick={() => { props.onChange(p.from, p.to); close(); }} className="rounded-full border border-line-2 px-3 py-1.5 text-xs font-semibold text-sand transition hover:border-ember hover:text-ember">
          {t.ui.datePresets[p.key]}
        </button>
      ))}
    </div>
  );
  const hint = range && (
    <p className="text-xs text-dust" aria-live="polite">{pendingStart ? t.ui.pickEnd(fmt(pendingStart, true)) : t.ui.pickStart}</p>
  );

  return (
    <div className={`field min-w-0 ${props.className ?? ""}`}>
      {props.hideLabel ? <label htmlFor={id} className="sr-only">{props.label}</label> : <FieldLabel htmlFor={id} label={props.label} required={props.required} />}
      {range ? (
        props.names && (
          <>
            <input type="hidden" name={props.names[0]} value={props.from} />
            <input type="hidden" name={props.names[1]} value={props.to} />
          </>
        )
      ) : (
        props.name && <input type="hidden" name={props.name} value={props.value} />
      )}
      <div className="relative min-w-0">
        <button
          id={id}
          ref={trigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={errText ? true : undefined}
          aria-describedby={errText || props.hint ? `${id}-m` : undefined}
          onClick={() => (open ? close() : setOpen(true))}
          className={`input flex min-w-0 items-center gap-3 pr-10 text-left ${open && !isMobile ? "border-ember" : ""}`}
        >
          <CalendarDays className="size-4 shrink-0 text-dust" />
          <span className={`min-w-0 flex-1 truncate ${hasValue ? "text-ivory" : "text-dust"}`}>{text || props.placeholder || (range ? t.ui.anyDate : t.ui.pickDate)}</span>
        </button>
        {hasValue && !props.required && (
          <button type="button" onClick={clear} aria-label={t.ui.clear} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-dust hover:text-ivory">
            <X className="size-4" />
          </button>
        )}
      </div>
      {(errText || props.hint) && <p id={`${id}-m`} className={errText ? "error" : "hint"} role={errText ? "alert" : undefined}>{errText ?? props.hint}</p>}

      {open && !isMobile && place && typeof document !== "undefined" &&
        createPortal(
          <div ref={pop} role="dialog" aria-label={props.label} style={{ position: "fixed", left: place.left, top: place.top, bottom: place.bottom }} className="z-[9999] grid w-[330px] gap-3 rounded-2xl border border-line-2 bg-ink-2 p-4 shadow-[var(--shadow)]">
            {presets}
            {grid}
            {hint}
          </div>,
          document.body,
        )}

      {isMobile && (
        <BottomSheet
          open={open}
          onClose={close}
          title={props.label}
          closeLabel={t.ui.close}
          footer={
            hasValue && !props.required ? (
              <button type="button" onClick={() => { clear(); close(); }} className="btn btn-ghost w-full">{t.ui.clear}</button>
            ) : undefined
          }
        >
          <div className="grid gap-4">
            {presets}
            {grid}
            {hint}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function presetRanges() {
  const d0 = today();
  const now = new Date(`${d0}T12:00:00Z`);
  const dow = (now.getUTCDay() + 6) % 7; // Monday = 0
  const monday = addDays(d0, -dow);
  const ym = d0.slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return [
    { key: "today" as const, from: d0, to: d0 },
    { key: "week" as const, from: monday, to: addDays(monday, 6) },
    { key: "month" as const, from: `${ym}-01`, to: monthEnd },
    { key: "next30" as const, from: d0, to: addDays(d0, 30) },
  ];
}

/** Month grid, Monday first, with range highlighting. */
function MonthGrid({ selected, min, max, onPick, big }: { selected: { from: string; to: string }; min?: string; max?: string; onPick: (d: string) => void; big: boolean }) {
  const { locale, t } = useI18n();
  const [month, setMonth] = useState(() => (selected.from || today()).slice(0, 7));
  const days = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [...Array<string | null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => addDays(`${month}-01`, i))];
  }, [month]);
  const loc = locale === "fr" ? "fr-FR" : "en-GB";
  const label = new Intl.DateTimeFormat(loc, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));
  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7));
  };
  const d0 = today();
  const { from, to } = selected;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={Boolean(min && month <= min.slice(0, 7))} aria-label={t.flow.date.prev} className="grid size-10 place-items-center rounded-full border border-line-2 text-ivory hover:border-sand disabled:opacity-25">
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-base font-bold capitalize text-ivory" aria-live="polite">{label}</p>
        <button type="button" onClick={() => shift(1)} disabled={Boolean(max && month >= max.slice(0, 7))} aria-label={t.flow.date.next} className="grid size-10 place-items-center rounded-full border border-line-2 text-ivory hover:border-sand disabled:opacity-25">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold tracking-widest text-dust" aria-hidden>
        {t.flow.date.weekdays.map((d, i) => <span key={i} className="py-1.5">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day, i) => {
          if (!day) return <span key={`e${i}`} />;
          const off = Boolean((min && day < min) || (max && day > max));
          const isEnd = day === from || day === to;
          const inside = Boolean(from && to && day > from && day < to);
          return (
            <span key={day} className={`relative flex justify-center ${inside ? "bg-ember/12" : ""} ${from && to && day === from && from !== to ? "bg-gradient-to-r from-transparent from-50% to-ember/12 to-50%" : ""} ${from && to && day === to && from !== to ? "bg-gradient-to-l from-transparent from-50% to-ember/12 to-50%" : ""}`}>
              <button
                type="button"
                disabled={off}
                aria-pressed={isEnd}
                aria-current={day === d0 ? "date" : undefined}
                aria-label={new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}
                onClick={() => onPick(day)}
                className={`grid place-items-center rounded-full font-semibold transition ${big ? "size-11 text-base" : "size-9 text-sm"} ${
                  isEnd ? "bg-ember text-on-ember shadow-[0_8px_20px_-8px_rgb(201_95_34/0.8)]" : off ? "text-dust/35" : "text-ivory hover:bg-ink-3"
                } ${day === d0 && !isEnd ? "ring-1 ring-ember/60" : ""}`}
              >
                {Number(day.slice(8))}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
