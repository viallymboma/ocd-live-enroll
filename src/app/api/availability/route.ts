import { ObjectId } from "mongodb";
import { NextResponse, type NextRequest } from "next/server";

import { availability } from "@/lib/schedule";
import { busyForWindow } from "@/server/bookings";
import { collections } from "@/server/db";
import { getRules } from "@/server/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?type=online&package=<id>
 * → { days: { "2026-11-12": ["09:00", "09:30", …] } }
 * Times where the WHOLE package fits; computed from the database, never the browser.
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const packageId = req.nextUrl.searchParams.get("package") ?? "";
  if ((type !== "online" && type !== "onsite") || !ObjectId.isValid(packageId)) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const { packages } = await collections();
  const pkg = await packages.findOne({ _id: new ObjectId(packageId), active: true });
  if (!pkg || !pkg.liveTypes.includes(type)) return NextResponse.json({ error: "package" }, { status: 404 });
  const [rules, busy] = await Promise.all([getRules(), busyForWindow(type)]);
  const days = availability(type, pkg.durationMinutes, rules, busy, new Date());
  return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
}
