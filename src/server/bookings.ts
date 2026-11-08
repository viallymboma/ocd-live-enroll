import "server-only";

import { randomInt } from "node:crypto";

import { ObjectId, type ClientSession } from "mongodb";

import { fits, startTimes, type Busy } from "@/lib/schedule";
import { lomeDay, lomeInstant } from "@/lib/time";
import { HOLDING_STATUSES, type BookingStatus, type BusinessInfo, type ContactInfo, type LiveType } from "@/lib/types";
import { collections, inTransaction, type BookingDoc, type Collections } from "./db";
import { getRules } from "./settings";

export class SlotTakenError extends Error {
  constructor() {
    super("slot-taken");
  }
}
export class BookingError extends Error {}

/** Busy ranges of one live type on the days around `day` (a booking never crosses midnight, but the gap can). */
async function busyRanges(c: Collections, liveType: LiveType, days: string[], session?: ClientSession, excludeId?: ObjectId): Promise<Busy[]> {
  const docs = await c.bookings
    .find(
      { liveType, day: { $in: days }, status: { $in: HOLDING_STATUSES }, ...(excludeId ? { _id: { $ne: excludeId } } : {}) },
      { projection: { start: 1, end: 1 }, session },
    )
    .toArray();
  return docs.map((d) => ({ start: d.start, end: d.end }));
}

/** Busy ranges for the whole booking window — feeds the public calendar. */
export async function busyForWindow(liveType: LiveType, excludeId?: ObjectId): Promise<Busy[]> {
  const c = await collections();
  const docs = await c.bookings
    .find(
      { liveType, status: { $in: HOLDING_STATUSES }, end: { $gte: new Date(Date.now() - 86_400_000) }, ...(excludeId ? { _id: { $ne: excludeId } } : {}) },
      { projection: { start: 1, end: 1 } },
    )
    .toArray();
  return docs.map((d) => ({ start: d.start, end: d.end }));
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
function newReference() {
  return "OCD-" + Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/**
 * Takes the per-(type, day) lock. Every transaction that books or moves on
 * that day writes the same document, so MongoDB lets only one commit: the
 * other gets a WriteConflict and `withTransaction` replays it — on data that
 * now includes the first booking. Without this, two snapshot transactions
 * could each see "no overlap" and both insert (write skew).
 */
async function lockDay(c: Collections, liveType: LiveType, day: string, session: ClientSession) {
  await c.dayLocks.updateOne({ _id: `${liveType}:${day}` }, { $inc: { v: 1 } }, { upsert: true, session });
}

/**
 * Re-checks, under the day lock, that the range still fits: opening hours,
 * closed days, notice, gap, capacity and every pending/validated booking.
 */
async function assertSlotFree(c: Collections, liveType: LiveType, day: string, time: string, durationMinutes: number, session: ClientSession, excludeId?: ObjectId) {
  const rules = await getRules();
  const neighbours = [day, ...[-1, 1].map((n) => lomeDay(new Date(lomeInstant(day, "12:00").getTime() + n * 86_400_000)))];
  const busy = await busyRanges(c, liveType, neighbours, session, excludeId);
  const offered = startTimes(day, liveType, durationMinutes, rules, busy, new Date());
  if (!offered.includes(time)) throw new SlotTakenError();
  const start = lomeInstant(day, time);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  if (!fits({ start, end }, busy, rules.gapMinutes, rules.capacity)) throw new SlotTakenError();
  return { start, end, rules };
}

export type NewBooking = {
  liveType: LiveType;
  packageId: string;
  day: string;
  time: string;
  business: BusinessInfo;
  contact: ContactInfo;
  uploads: { logo: string | null; photos: string[] };
  locale: "fr" | "en";
};

export async function createBooking(input: NewBooking): Promise<BookingDoc> {
  const c = await collections();
  if (!ObjectId.isValid(input.packageId)) throw new BookingError("package");
  const pkg = await c.packages.findOne({ _id: new ObjectId(input.packageId), active: true });
  if (!pkg || !pkg.liveTypes.includes(input.liveType)) throw new BookingError("package");

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await inTransaction(async (session) => {
        await lockDay(c, input.liveType, input.day, session);
        const { start, end, rules } = await assertSlotFree(c, input.liveType, input.day, input.time, pkg.durationMinutes, session);
        const now = new Date();
        const doc: BookingDoc = {
          _id: new ObjectId(),
          reference: newReference(),
          status: "pending",
          liveType: input.liveType,
          package: {
            id: pkg._id.toHexString(),
            name: pkg.name,
            durationMinutes: pkg.durationMinutes,
            price: pkg.price,
            currency: rules.currency,
            deliverables: pkg.deliverables,
          },
          start,
          end,
          day: input.day,
          business: input.business,
          contact: input.contact,
          uploads: input.uploads,
          locale: input.locale,
          notes: [],
          history: [{ at: now, by: "client", action: "created" }],
          createdAt: now,
          updatedAt: now,
        };
        await c.bookings.insertOne(doc, { session });
        return doc;
      });
    } catch (e) {
      // Duplicate reference (1 in ~1M): draw another one.
      if (typeof e === "object" && e && "code" in e && (e as { code: number }).code === 11000) continue;
      throw e;
    }
  }
  throw new BookingError("reference");
}

/** Allowed status changes. Rejected/cancelled release the time; pending/validated keep it. */
const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["validated", "rejected", "cancelled"],
  validated: ["cancelled"],
  rejected: [],
  cancelled: [],
};

export async function changeStatus(id: string, to: BookingStatus, by: string, reason?: string) {
  const c = await collections();
  const booking = await c.bookings.findOne({ _id: new ObjectId(id) });
  if (!booking) throw new BookingError("not-found");
  if (!TRANSITIONS[booking.status].includes(to)) throw new BookingError("transition");
  const now = new Date();
  // The status filter makes the change atomic: a double click cannot apply it twice.
  const res = await c.bookings.updateOne(
    { _id: booking._id, status: booking.status },
    {
      $set: { status: to, updatedAt: now, ...(to === "rejected" ? { rejectionReason: reason ?? "" } : {}) },
      $push: { history: { at: now, by, action: to, from: booking.status, to, ...(reason ? { reason } : {}) } },
    },
  );
  if (res.modifiedCount === 0) throw new BookingError("transition");
  return { ...booking, status: to, rejectionReason: reason };
}

export async function moveBooking(id: string, day: string, time: string, by: string) {
  const c = await collections();
  const _id = new ObjectId(id);
  const booking = await c.bookings.findOne({ _id });
  if (!booking) throw new BookingError("not-found");
  if (!HOLDING_STATUSES.includes(booking.status)) throw new BookingError("transition");
  const from = `${booking.day} ${booking.start.toISOString().slice(11, 16)}`;
  return inTransaction(async (session) => {
    // Lock both days in a fixed order so two moves can never deadlock-retry forever.
    for (const d of [...new Set([booking.day, day])].sort()) await lockDay(c, booking.liveType, d, session);
    const { start, end } = await assertSlotFree(c, booking.liveType, day, time, booking.package.durationMinutes, session, _id);
    const now = new Date();
    await c.bookings.updateOne(
      { _id },
      { $set: { start, end, day, updatedAt: now }, $push: { history: { at: now, by, action: "moved", from, to: `${day} ${time}` } } },
      { session },
    );
    return { ...booking, start, end, day };
  });
}

export async function addNote(id: string, by: string, text: string) {
  const c = await collections();
  await c.bookings.updateOne({ _id: new ObjectId(id) }, { $push: { notes: { at: new Date(), by, text } }, $set: { updatedAt: new Date() } });
}
