import "server-only";

import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { collections, type AdminDoc } from "./db";
import { env } from "./env";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "ocd_admin";
const MAX_AGE = 7 * 24 * 3600;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

function sign(payload: string) {
  return createHmac("sha256", env().AUTH_SECRET).update(payload).digest("base64url");
}

function encode(admin: AdminDoc) {
  const payload = Buffer.from(JSON.stringify({ id: admin._id.toHexString(), v: admin.sessionVersion, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

async function setSession(admin: AdminDoc) {
  (await cookies()).set(COOKIE, encode(admin), {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export type Admin = { id: string; email: string; name: string };

/** The signed-in admin, or null. Re-reads the account so a password change signs other devices out. */
export async function currentAdmin(): Promise<Admin | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let data: { id: string; v: number; exp: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (data.exp < Date.now() || !ObjectId.isValid(data.id)) return null;
  const { admins } = await collections();
  const admin = await admins.findOne({ _id: new ObjectId(data.id) });
  if (!admin || admin.sessionVersion !== data.v) return null;
  return { id: admin._id.toHexString(), email: admin.email, name: admin.name };
}

/** Use at the top of every admin page and action. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export type LoginResult = "ok" | "invalid" | "locked";

export async function login(email: string, password: string): Promise<LoginResult> {
  const { admins } = await collections();
  const admin = await admins.findOne({ email: email.trim().toLowerCase() });
  if (!admin) {
    await hashPassword(password); // same timing whether or not the email exists
    return "invalid";
  }
  if (admin.lockedUntil && admin.lockedUntil > new Date()) return "locked";
  if (!(await verifyPassword(password, admin.passwordHash))) {
    const failed = admin.failedLogins + 1;
    await admins.updateOne(
      { _id: admin._id },
      { $set: { failedLogins: failed >= MAX_FAILED ? 0 : failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null } },
    );
    return failed >= MAX_FAILED ? "locked" : "invalid";
  }
  await admins.updateOne({ _id: admin._id }, { $set: { failedLogins: 0, lockedUntil: null } });
  await setSession(admin);
  return "ok";
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

export async function adminCount() {
  const { admins } = await collections();
  return admins.countDocuments();
}

export function setupTokenMatches(token: string) {
  const expected = env().SETUP_TOKEN;
  if (!expected) return false;
  const a = createHmac("sha256", "cmp").update(token).digest();
  const b = createHmac("sha256", "cmp").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Creates the FIRST admin only. Refused as soon as one exists, and only with
 * SETUP_TOKEN — there is no public way to create an admin.
 */
export async function createFirstAdmin(input: { email: string; name: string; password: string }) {
  const { admins } = await collections();
  if ((await admins.countDocuments()) > 0) return false;
  const doc: AdminDoc = {
    _id: new ObjectId(),
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    passwordHash: await hashPassword(input.password),
    sessionVersion: 1,
    failedLogins: 0,
    lockedUntil: null,
    createdAt: new Date(),
  };
  await admins.insertOne(doc);
  await setSession(doc);
  return true;
}
