import { ObjectId } from "mongodb";
import { NextResponse, type NextRequest } from "next/server";

import { availability } from "@/lib/schedule";
import { currentAdmin } from "@/server/auth";
import { busyForWindow } from "@/server/bookings";
import { getRequest } from "@/server/queries";
import { getRules } from "@/server/settings";

export const dynamic = "force-dynamic";

/** Free slots to MOVE a booking: same live type and duration, the booking's own time not counted. */
export async function GET(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await getRequest(req.nextUrl.searchParams.get("id") ?? "");
  if (!b) return NextResponse.json({ error: "not-found" }, { status: 404 });
  const [rules, busy] = await Promise.all([getRules(), busyForWindow(b.liveType, new ObjectId(b._id))]);
  // The CEO may place a live sooner than the public notice allows.
  const days = availability(b.liveType, b.package.durationMinutes, { ...rules, minNoticeHours: 0 }, busy, new Date());
  return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
}
