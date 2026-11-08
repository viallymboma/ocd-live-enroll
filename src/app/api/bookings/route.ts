import { waitUntil } from "@vercel/functions";
import { NextResponse, type NextRequest } from "next/server";

import { bookingSchema, fieldErrors } from "@/lib/validation";
import { BookingError, createBooking, SlotTakenError } from "@/server/bookings";
import { mailAdminNewRequest, mailClient } from "@/server/mail";
import { isOwnKey } from "@/server/storage";

export const dynamic = "force-dynamic";

/** POST a booking request. The slot is re-checked under a lock; 409 = just taken. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", fields: fieldErrors(parsed.error) }, { status: 422 });
  const input = parsed.data;
  // Only files our own upload route produced may be attached.
  const keys = [input.uploads.logo, ...input.uploads.photos].filter(Boolean) as string[];
  if (keys.some((k) => !isOwnKey(k))) return NextResponse.json({ error: "uploads" }, { status: 422 });

  try {
    const booking = await createBooking({
      liveType: input.liveType,
      packageId: input.packageId,
      day: input.day,
      time: input.time,
      business: input.business,
      contact: input.contact,
      uploads: input.uploads,
      locale: input.locale,
    });
    const adminUrl = `${req.nextUrl.origin}/admin/demandes/${booking._id.toHexString()}`;
    // Emails after the response — a mail failure never fails the request.
    waitUntil(Promise.allSettled([mailClient("received", booking), mailAdminNewRequest(booking, adminUrl)]));
    return NextResponse.json({ reference: booking.reference }, { status: 201 });
  } catch (e) {
    if (e instanceof SlotTakenError) return NextResponse.json({ error: "slot-taken" }, { status: 409 });
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("[bookings]", e);
    return NextResponse.json({ error: "server" }, { status: 500 });
  }
}
