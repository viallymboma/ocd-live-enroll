"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { useI18n } from "@/i18n/client";
import { addDays } from "@/lib/time";

/** Month grid, Monday first. Only days present in `available` can be picked. */
export function Calendar({ available, value, onChange }: { available: Record<string, string[]>; value: string | null; onChange: (day: string) => void }) {
  const { locale, t } = useI18n();
  const days = Object.keys(available).sort();
  const first = days[0];
  const last = days[days.length - 1];
  const [month, setMonth] = useState(() => (value ?? first ?? new Date().toISOString().slice(0, 10)).slice(0, 7));

  const grid = useMemo(() => {
    const start = `${month}-01`;
    const [y, m] = month.split("-").map(Number);
    const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [...Array<string | null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => addDays(start, i))];
  }, [month]);

  const label = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));
  const shift = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7));
  };
  const canPrev = first ? month > first.slice(0, 7) : false;
  const canNext = last ? month < last.slice(0, 7) : false;

  return (
    <div className="card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} disabled={!canPrev} aria-label={t.flow.date.prev} className="grid size-10 place-items-center rounded-full border border-line-2 text-ivory transition hover:border-sand disabled:opacity-25">
          <ChevronLeft className="size-5" />
        </button>
        <p className="display text-2xl capitalize" aria-live="polite">{label}</p>
        <button type="button" onClick={() => shift(1)} disabled={!canNext} aria-label={t.flow.date.next} className="grid size-10 place-items-center rounded-full border border-line-2 text-ivory transition hover:border-sand disabled:opacity-25">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold tracking-widest text-dust" aria-hidden>
        {t.flow.date.weekdays.map((d, i) => <span key={i} className="py-2">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1" role="grid">
        {grid.map((day, i) => {
          if (!day) return <span key={`e${i}`} />;
          const open = Boolean(available[day]);
          const selected = value === day;
          const n = Number(day.slice(8));
          return (
            <button
              key={day}
              type="button"
              disabled={!open}
              aria-pressed={selected}
              aria-label={new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}
              onClick={() => onChange(day)}
              className={`relative aspect-square rounded-xl text-sm font-bold transition duration-300 ease-out-expo sm:text-base ${
                selected
                  ? "scale-105 bg-ember text-ink shadow-[0_10px_30px_-10px_rgb(210_105_42/0.9)]"
                  : open
                    ? "bg-ink-3 text-ivory hover:bg-line-2"
                    : "text-dust/40 line-through decoration-dust/30"
              }`}
            >
              {n}
              {open && !selected && <span aria-hidden className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
