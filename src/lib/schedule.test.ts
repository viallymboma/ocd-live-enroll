import { describe, expect, it } from "vitest";
import { availability, conflicts, fits, startTimes } from "./schedule";
import type { DayHours, ScheduleRules } from "./types";

const h = (open: string, close: string): DayHours => ({ open, close });
const week = (d: DayHours): DayHours[] => [null, d, d, d, d, d, d];
const rules = (over: Partial<ScheduleRules> = {}): ScheduleRules => ({
  currency: "XAF",
  currencyConfirmed: false,
  gapMinutes: 0,
  capacity: 1,
  stepMinutes: 30,
  bookingWindowDays: 30,
  minNoticeHours: 0,
  hours: { online: week(h("09:00", "18:00")), onsite: week(h("09:00", "18:00")) },
  closedDays: [],
  ...over,
});
const at = (s: string) => new Date(`${s}Z`);
const busy = (a: string, b: string) => ({ start: at(a), end: at(b) });
const NOW = at("2026-11-01T00:00:00"); // a Sunday
const MON = "2026-11-02";

describe("conflicts", () => {
  it("overlapping ranges of different lengths conflict", () => {
    expect(conflicts(busy("2026-11-02T10:00", "2026-11-02T14:00"), busy("2026-11-02T13:00", "2026-11-02T15:00"), 0)).toBe(true);
  });
  it("back-to-back ranges do not conflict without a gap", () => {
    expect(conflicts(busy("2026-11-02T10:00", "2026-11-02T14:00"), busy("2026-11-02T14:00", "2026-11-02T15:00"), 0)).toBe(false);
  });
  it("the gap pushes the next booking away", () => {
    const a = busy("2026-11-02T10:00", "2026-11-02T14:00");
    expect(conflicts(a, busy("2026-11-02T14:15", "2026-11-02T15:00"), 30)).toBe(true);
    expect(conflicts(a, busy("2026-11-02T14:30", "2026-11-02T15:00"), 30)).toBe(false);
  });
});

describe("startTimes", () => {
  it("a 4 h package is never offered at 17:00 when the day ends at 18:00", () => {
    const times = startTimes(MON, "online", 240, rules(), [], NOW);
    expect(times).toContain("14:00");
    expect(times).not.toContain("14:30");
    expect(times).not.toContain("17:00");
  });
  it("closed weekday and closed date give nothing", () => {
    expect(startTimes("2026-11-01", "online", 90, rules(), [], NOW)).toEqual([]);
    const r = rules({ closedDays: [{ date: MON, liveType: "onsite", note: "" }] });
    expect(startTimes(MON, "onsite", 90, r, [], NOW)).toEqual([]);
    expect(startTimes(MON, "online", 90, r, [], NOW).length).toBeGreaterThan(0);
  });
  it("respects existing bookings and the gap", () => {
    const b = [busy(`${MON}T10:00`, `${MON}T14:00`)];
    const times = startTimes(MON, "online", 60, rules({ gapMinutes: 30 }), b, NOW);
    expect(times).toEqual(["14:30", "15:00", "15:30", "16:00", "16:30", "17:00"]);
  });
  it("minimum notice hides times too soon", () => {
    const now = at(`${MON}T10:10`);
    const times = startTimes(MON, "online", 60, rules({ minNoticeHours: 2 }), [], now);
    expect(times[0]).toBe("12:30");
  });
});

describe("capacity", () => {
  it("capacity 2 accepts one overlap but not two", () => {
    const c = busy(`${MON}T10:00`, `${MON}T12:00`);
    const one = [busy(`${MON}T09:00`, `${MON}T11:00`)];
    const two = [...one, busy(`${MON}T11:00`, `${MON}T13:00`)];
    const three = [...one, busy(`${MON}T10:30`, `${MON}T11:30`)];
    expect(fits(c, one, 0, 2)).toBe(true);
    expect(fits(c, two, 0, 2)).toBe(true); // never 2 at the same instant
    expect(fits(c, three, 0, 2)).toBe(false);
  });
});

describe("availability", () => {
  it("lists only days with room", () => {
    const days = availability("online", 540, rules(), [busy(`${MON}T09:00`, `${MON}T10:00`)], NOW);
    expect(days[MON]).toBeUndefined();
    expect(days["2026-11-03"]).toEqual(["09:00"]);
  });
});
