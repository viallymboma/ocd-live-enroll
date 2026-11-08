"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { LIVE_TYPES, type LiveType, type ScheduleRules } from "@/lib/types";
import { adminCount, createFirstAdmin, login, logout, requireAdmin, setupTokenMatches } from "@/server/auth";
import { addNote, BookingError, changeStatus, moveBooking, SlotTakenError } from "@/server/bookings";
import { collections } from "@/server/db";
import { mailClient } from "@/server/mail";
import { saveRules } from "@/server/settings";

export type FormState = { error?: string; ok?: string } | undefined;

// ------------------------------------------------------------------ auth

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const r = await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (r !== "ok") return { error: r };
  redirect("/admin");
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function setupAction(_: FormState, form: FormData): Promise<FormState> {
  if ((await adminCount()) > 0) return { error: "done" };
  if (!setupTokenMatches(String(form.get("token") ?? ""))) return { error: "badToken" };
  const email = String(form.get("email") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!z.email().safeParse(email).success || !name) return { error: "badToken" };
  if (password.length < 10) return { error: "weak" };
  if (!(await createFirstAdmin({ email, name, password }))) return { error: "done" };
  redirect("/admin");
}

// ------------------------------------------------------------------ requests

function id(form: FormData) {
  const v = String(form.get("id") ?? "");
  if (!ObjectId.isValid(v)) throw new BookingError("not-found");
  return v;
}

async function afterChange(bookingId: string) {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/demandes/${bookingId}`);
}

export async function statusAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const bookingId = id(form);
  const to = String(form.get("to"));
  if (to !== "validated" && to !== "rejected" && to !== "cancelled") return { error: "transition" };
  const reason = String(form.get("reason") ?? "").trim().slice(0, 1000) || undefined;
  try {
    const b = await changeStatus(bookingId, to, admin.name, reason);
    // The client hears about every decision. Internal cancel reasons are not sent.
    await mailClient(to, to === "cancelled" ? { ...b, rejectionReason: undefined } : b);
  } catch (e) {
    if (e instanceof BookingError) return { error: "transition" };
    throw e;
  }
  await afterChange(bookingId);
  return { ok: "ok" };
}

export async function moveAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const bookingId = id(form);
  const day = String(form.get("day") ?? "");
  const time = String(form.get("time") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return { error: "taken" };
  try {
    const b = await moveBooking(bookingId, day, time, admin.name);
    await mailClient("moved", b);
  } catch (e) {
    if (e instanceof SlotTakenError) return { error: "taken" };
    if (e instanceof BookingError) return { error: "transition" };
    throw e;
  }
  await afterChange(bookingId);
  return { ok: "ok" };
}

export async function noteAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const bookingId = id(form);
  const text = String(form.get("text") ?? "").trim().slice(0, 2000);
  if (!text) return undefined;
  await addNote(bookingId, admin.name, text);
  await afterChange(bookingId);
  return { ok: "ok" };
}

// ------------------------------------------------------------------ packages

const lines = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);

export async function packageAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const liveTypes = LIVE_TYPES.filter((lt) => form.get(`type_${lt}`) === "on");
  const data = {
    name: { fr: String(form.get("name_fr") ?? "").trim().slice(0, 80), en: String(form.get("name_en") ?? "").trim().slice(0, 80) },
    description: { fr: String(form.get("desc_fr") ?? "").trim().slice(0, 600), en: String(form.get("desc_en") ?? "").trim().slice(0, 600) },
    deliverables: { fr: lines(form.get("deliv_fr")), en: lines(form.get("deliv_en")) },
    durationMinutes: Number(form.get("duration")),
    price: Math.max(0, Math.round(Number(form.get("price")) || 0)),
    liveTypes,
    order: Number(form.get("order")) || 0,
    active: form.get("active") === "on",
    placeholder: form.get("placeholder") === "on",
  };
  if (!data.name.fr || !Number.isInteger(data.durationMinutes) || data.durationMinutes < 15 || data.durationMinutes > 720 || liveTypes.length === 0) {
    return { error: "invalid" };
  }
  if (!data.name.en) data.name.en = data.name.fr;
  if (!data.description.en) data.description.en = data.description.fr;
  if (data.deliverables.en.length === 0) data.deliverables.en = data.deliverables.fr;
  const { packages } = await collections();
  const raw = String(form.get("id") ?? "");
  const now = new Date();
  if (raw === "new") await packages.insertOne({ _id: new ObjectId(), ...data, createdAt: now, updatedAt: now });
  else if (ObjectId.isValid(raw)) await packages.updateOne({ _id: new ObjectId(raw) }, { $set: { ...data, updatedAt: now } });
  revalidatePath("/", "layout");
  return { ok: "saved" };
}

// ------------------------------------------------------------------ schedule

const hhmm = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

export async function scheduleAction(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const num = (k: string, min: number, max: number, def: number) => {
    const n = Math.round(Number(form.get(k)));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const hours = {} as ScheduleRules["hours"];
  for (const lt of LIVE_TYPES as LiveType[]) {
    hours[lt] = [];
    for (let d = 0; d < 7; d++) {
      const open = String(form.get(`${lt}_${d}_open`) ?? "");
      const close = String(form.get(`${lt}_${d}_close`) ?? "");
      if (form.get(`${lt}_${d}_on`) !== "on") {
        hours[lt].push(null);
        continue;
      }
      if (!hhmm.test(open) || !hhmm.test(close) || close <= open) return { error: "invalid" };
      hours[lt].push({ open, close });
    }
  }
  const dates = form.getAll("closed_date").map(String);
  const types = form.getAll("closed_type").map(String);
  const notes = form.getAll("closed_note").map(String);
  const closedDays = dates
    .map((date, i) => ({ date, liveType: (["online", "onsite", "both"].includes(types[i]) ? types[i] : "both") as LiveType | "both", note: (notes[i] ?? "").slice(0, 120) }))
    .filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const currency = String(form.get("currency") ?? "").trim().toUpperCase();
  await saveRules({
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "XAF",
    currencyConfirmed: form.get("currencyConfirmed") === "on",
    gapMinutes: num("gap", 0, 240, 30),
    capacity: num("capacity", 1, 20, 1),
    stepMinutes: [15, 30, 60].includes(Number(form.get("step"))) ? Number(form.get("step")) : 30,
    bookingWindowDays: num("window", 7, 365, 60),
    minNoticeHours: num("notice", 0, 336, 24),
    hours,
    closedDays,
  });
  revalidatePath("/", "layout");
  return { ok: "saved" };
}
