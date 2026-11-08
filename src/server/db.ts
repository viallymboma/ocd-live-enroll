import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { MongoClient, type ClientSession, type Collection, type Db, type ObjectId } from "mongodb";

import type { BookingStatus, BusinessInfo, ClosedDay, ContactInfo, DayHours, LiveType, Localized, LocalizedList } from "@/lib/types";
import { env } from "./env";

/**
 * ONE MongoDB client for the whole app (Atlas free tier limits connections).
 * Same cluster as FOSOBA, separate database (MONGODB_DB=ocd_live).
 */
const g = globalThis as typeof globalThis & { __ocdMongo?: { client: MongoClient; ready: Promise<Db> | null } };

function cache() {
  if (!g.__ocdMongo) {
    const client = new MongoClient(env().MONGODB_URI, { maxPoolSize: 10, maxIdleTimeMS: 60_000, appName: "ocd-live", serverSelectionTimeoutMS: 10_000 });
    attachDatabasePool(client);
    g.__ocdMongo = { client, ready: null };
  }
  return g.__ocdMongo;
}

export async function database(): Promise<Db> {
  const c = cache();
  c.ready ??= (async () => {
    await c.client.connect();
    const db = c.client.db(env().MONGODB_DB);
    await ensureIndexes(db);
    return db;
  })().catch((e) => {
    c.ready = null; // retry on the next request instead of staying broken
    throw e;
  });
  return c.ready;
}

// ------------------------------------------------------------------ documents

export type PackageDoc = {
  _id: ObjectId;
  name: Localized;
  description: Localized;
  deliverables: LocalizedList;
  durationMinutes: number;
  price: number;
  liveTypes: LiveType[];
  order: number;
  active: boolean;
  placeholder: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ScheduleDoc = {
  _id: "main";
  currency: string;
  currencyConfirmed: boolean;
  gapMinutes: number;
  capacity: number;
  stepMinutes: number;
  bookingWindowDays: number;
  minNoticeHours: number;
  hours: Record<LiveType, DayHours[]>;
  closedDays: ClosedDay[];
  updatedAt: Date;
};

export type HistoryEntry = { at: Date; by: string; action: string; reason?: string; from?: string; to?: string };

export type BookingDoc = {
  _id: ObjectId;
  reference: string;
  status: BookingStatus;
  liveType: LiveType;
  /** Copy of the package as it was when the request was sent — later edits never rewrite it. */
  package: { id: string; name: Localized; durationMinutes: number; price: number; currency: string; deliverables: LocalizedList };
  start: Date;
  end: Date;
  /** Lomé calendar day of `start`, for locking and filtering. */
  day: string;
  business: BusinessInfo;
  contact: ContactInfo;
  uploads: { logo: string | null; photos: string[] };
  locale: "fr" | "en";
  notes: { at: Date; by: string; text: string }[];
  history: HistoryEntry[];
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminDoc = {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  /** Bumped to sign every device out. */
  sessionVersion: number;
  failedLogins: number;
  lockedUntil: Date | null;
  createdAt: Date;
};

/**
 * One tiny document per (live type, day). Every booking write on that day
 * increments it inside the transaction, so two transactions racing for the
 * same day WRITE-CONFLICT and one is retried on fresh data (see bookings.ts).
 */
export type DayLockDoc = { _id: string; v: number };

export async function collections() {
  const db = await database();
  return {
    packages: db.collection<PackageDoc>("packages"),
    schedule: db.collection<ScheduleDoc>("scheduleRules"),
    bookings: db.collection<BookingDoc>("bookings"),
    admins: db.collection<AdminDoc>("admins"),
    dayLocks: db.collection<DayLockDoc>("dayLocks"),
  };
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("bookings").createIndex({ reference: 1 }, { unique: true }),
    db.collection("bookings").createIndex({ liveType: 1, day: 1, status: 1 }),
    db.collection("bookings").createIndex({ status: 1, createdAt: -1 }),
    db.collection("bookings").createIndex({ start: 1 }),
    db.collection("admins").createIndex({ email: 1 }, { unique: true }),
    db.collection("packages").createIndex({ order: 1 }),
  ]);
}

/**
 * Runs `fn` in a transaction (Atlas is a replica set). `withTransaction`
 * retries automatically on transient errors such as a write conflict.
 */
export async function inTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  await database();
  const session = cache().client.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
    return result;
  } finally {
    await session.endSession();
  }
}

export type Collections = Awaited<ReturnType<typeof collections>>;
export type { Collection };
