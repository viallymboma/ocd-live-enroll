/**
 * Time in OCD Live = Africa/Lomé, which is UTC+0 all year (no daylight saving).
 * Dates are stored as real UTC instants; a "day" is the Lomé calendar date
 * "YYYY-MM-DD" and a "time" is "HH:MM" Lomé wall-clock time.
 */
export const TIME_ZONE = "Africa/Lome";
const OFFSET_MINUTES = 0; // Lomé = UTC+0

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** The instant at which `day` + `time` happens in Lomé. */
export function lomeInstant(day: string, time: string): Date {
  const [y, mo, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d) + (toMinutes(time) - OFFSET_MINUTES) * 60_000);
}

/** The Lomé calendar date of an instant. */
export function lomeDay(at: Date): string {
  return new Date(at.getTime() + OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** The Lomé wall-clock time of an instant. */
export function lomeTime(at: Date): string {
  return new Date(at.getTime() + OFFSET_MINUTES * 60_000).toISOString().slice(11, 16);
}

/** 0 = Sunday … 6 = Saturday, for a "YYYY-MM-DD" day. */
export function weekday(day: string): number {
  const [y, mo, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

export function addDays(day: string, n: number): string {
  const [y, mo, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + n)).toISOString().slice(0, 10);
}

export function formatDuration(minutes: number, locale: "fr" | "en"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return locale === "fr" ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

export function formatDay(day: string, locale: "fr" | "en", opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { ...opts, timeZone: "UTC" }).format(lomeInstant(day, "12:00"));
}

/** XOF and XAF are both written "FCFA" locally. */
export function currencyLabel(currency: string) {
  return currency === "XOF" || currency === "XAF" ? "FCFA" : currency;
}

export function formatMoney(amount: number, currency: string, locale: "fr" | "en") {
  const n = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", { maximumFractionDigits: 0, useGrouping: "always" } as Intl.NumberFormatOptions).format(amount);
  return `${n} ${currencyLabel(currency)}`;
}
