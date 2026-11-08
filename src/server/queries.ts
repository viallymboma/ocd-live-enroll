import "server-only";

import { ObjectId, type Filter } from "mongodb";

import { lomeDay } from "@/lib/time";
import { BOOKING_STATUSES, type BookingStatus, type LiveType } from "@/lib/types";
import { collections, type BookingDoc } from "./db";

export type RequestFilters = { status?: BookingStatus; type?: LiveType; pkg?: string; from?: string; to?: string; q?: string };

export function readFilters(sp: Record<string, string | undefined>): RequestFilters {
  const f: RequestFilters = {};
  if (sp.status && (BOOKING_STATUSES as string[]).includes(sp.status)) f.status = sp.status as BookingStatus;
  if (sp.type === "online" || sp.type === "onsite") f.type = sp.type;
  if (sp.pkg && ObjectId.isValid(sp.pkg)) f.pkg = sp.pkg;
  if (sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)) f.from = sp.from;
  if (sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)) f.to = sp.to;
  if (sp.q?.trim()) f.q = sp.q.trim().slice(0, 80);
  return f;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toQuery(f: RequestFilters): Filter<BookingDoc> {
  const q: Filter<BookingDoc> = {};
  if (f.status) q.status = f.status;
  if (f.type) q.liveType = f.type;
  if (f.pkg) q["package.id"] = f.pkg;
  if (f.from || f.to) q.day = { ...(f.from ? { $gte: f.from } : {}), ...(f.to ? { $lte: f.to } : {}) };
  if (f.q) {
    const digits = f.q.replace(/\D/g, "");
    q.$or = [
      { "business.name": { $regex: escapeRegex(f.q), $options: "i" } },
      { reference: { $regex: escapeRegex(f.q.toUpperCase()) } },
      ...(digits.length >= 4 ? [{ "contact.whatsapp": { $regex: digits } }] : []),
    ];
  }
  return q;
}

export const PAGE_SIZE = 25;

export async function listRequests(f: RequestFilters, page: number) {
  const { bookings } = await collections();
  const q = toQuery(f);
  const [items, total] = await Promise.all([
    bookings.find(q).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).toArray(),
    bookings.countDocuments(q),
  ]);
  return { items, total };
}

export async function allRequests(f: RequestFilters) {
  const { bookings } = await collections();
  return bookings.find(toQuery(f)).sort({ start: 1 }).limit(5000).toArray();
}

export async function getRequest(id: string) {
  if (!ObjectId.isValid(id)) return null;
  const { bookings } = await collections();
  return bookings.findOne({ _id: new ObjectId(id) });
}

export async function overview(weekStart: string) {
  const { bookings } = await collections();
  const now = new Date();
  const monthStart = `${lomeDay(now).slice(0, 7)}-01`;
  const weekEnd = new Date(Date.parse(`${weekStart}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const [pending, validatedMonth, upcoming, week] = await Promise.all([
    bookings.countDocuments({ status: "pending" }),
    // "This month" = lives scheduled this month that are validated.
    bookings.find({ status: "validated", day: { $gte: monthStart, $lt: nextMonth(monthStart) } }, { projection: { "package.price": 1, "package.currency": 1 } }).toArray(),
    bookings.find({ status: { $in: ["pending", "validated"] }, end: { $gte: now } }).sort({ start: 1 }).limit(8).toArray(),
    bookings.find({ status: { $in: ["pending", "validated"] }, day: { $gte: weekStart, $lt: weekEnd } }).sort({ start: 1 }).toArray(),
  ]);
  const revenue = validatedMonth.reduce((sum, b) => sum + (b.package.price || 0), 0);
  return { pending, validatedCount: validatedMonth.length, revenue, currency: validatedMonth[0]?.package.currency, upcoming, week };
}

function nextMonth(first: string) {
  const [y, m] = first.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}
