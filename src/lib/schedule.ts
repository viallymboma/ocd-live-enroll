/**
 * THE AVAILABILITY RULES — pure functions, no database.
 * The browser never decides: the server runs this both to list free times
 * and again, inside a locked transaction, at the moment a request is saved.
 */
import type { ClosedDay, LiveType, ScheduleRules } from "./types";
import { addDays, fromMinutes, lomeDay, lomeInstant, toMinutes, weekday } from "./time";

/** A time range that is already taken (pending or validated booking). */
export type Busy = { start: Date; end: Date };

/**
 * Two bookings conflict when they overlap once the required gap is added
 * between them. 10:00–14:00 and 13:00–15:00 conflict; with a 30-minute gap,
 * 10:00–14:00 and 14:15–15:00 conflict too, but 14:30–15:00 does not.
 */
export function conflicts(a: Busy, b: Busy, gapMinutes: number): boolean {
  const gap = gapMinutes * 60_000;
  return a.start.getTime() < b.end.getTime() + gap && b.start.getTime() < a.end.getTime() + gap;
}

/**
 * Is there room for `candidate` given the bookings already holding time?
 * With capacity 1 (default) any conflict refuses it. With capacity N we check
 * that, at every instant of the candidate's range, fewer than N bookings
 * (gap included) are already running.
 */
export function fits(candidate: Busy, busy: Busy[], gapMinutes: number, capacity: number): boolean {
  const overlapping = busy.filter((b) => conflicts(candidate, b, gapMinutes));
  if (overlapping.length < capacity) return true;
  const gap = gapMinutes * 60_000;
  // Sweep line over the padded ranges, clipped to the candidate.
  const events: [number, number][] = [];
  for (const b of overlapping) {
    events.push([Math.max(b.start.getTime() - gap, candidate.start.getTime()), +1]);
    events.push([Math.min(b.end.getTime() + gap, candidate.end.getTime()), -1]);
  }
  events.sort((x, y) => x[0] - y[0] || x[1] - y[1]); // ends before starts at the same instant
  let running = 0;
  for (const [, delta] of events) {
    running += delta;
    if (running >= capacity) return false;
  }
  return true;
}

export function isClosed(day: string, liveType: LiveType, closedDays: ClosedDay[]): boolean {
  return closedDays.some((c) => c.date === day && (c.liveType === "both" || c.liveType === liveType));
}

/**
 * Start times on `day` where the WHOLE package fits inside opening hours,
 * respects the minimum notice, and has room given the busy ranges.
 */
export function startTimes(
  day: string,
  liveType: LiveType,
  durationMinutes: number,
  rules: ScheduleRules,
  busy: Busy[],
  now: Date,
): string[] {
  if (isClosed(day, liveType, rules.closedDays)) return [];
  const hours = rules.hours[liveType][weekday(day)];
  if (!hours) return [];
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const earliest = now.getTime() + rules.minNoticeHours * 3_600_000;
  const out: string[] = [];
  for (let t = open; t + durationMinutes <= close; t += rules.stepMinutes) {
    const start = lomeInstant(day, fromMinutes(t));
    if (start.getTime() < earliest) continue;
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    if (fits({ start, end }, busy, rules.gapMinutes, rules.capacity)) out.push(fromMinutes(t));
  }
  return out;
}

/** The bookable window: from today (Lomé) for `bookingWindowDays` days. */
export function windowDays(rules: ScheduleRules, now: Date): string[] {
  const first = lomeDay(now);
  return Array.from({ length: rules.bookingWindowDays + 1 }, (_, i) => addDays(first, i));
}

export function availability(
  liveType: LiveType,
  durationMinutes: number,
  rules: ScheduleRules,
  busy: Busy[],
  now: Date,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const day of windowDays(rules, now)) {
    const times = startTimes(day, liveType, durationMinutes, rules, busy, now);
    if (times.length) out[day] = times;
  }
  return out;
}
