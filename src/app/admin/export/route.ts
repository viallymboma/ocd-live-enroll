import { NextResponse, type NextRequest } from "next/server";

import { lomeTime } from "@/lib/time";
import { currentAdmin } from "@/server/auth";
import { allRequests, readFilters } from "@/server/queries";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // no formula injection in Excel
  return `"${s.replace(/"/g, '""')}"`;
};

/** CSV (UTF-8 with BOM, ";" separator) — opens directly in Excel with French settings. */
export async function GET(req: NextRequest) {
  if (!(await currentAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const f = readFilters(Object.fromEntries(req.nextUrl.searchParams));
  const rows = await allRequests(f);
  const header = ["Reference", "Status", "Live type", "Package", "Duration (min)", "Price", "Currency", "Date", "Start", "End", "Business", "Sector", "Product", "Description", "Country", "City", "TikTok", "Instagram", "Facebook", "Website", "Special requests", "Contact", "WhatsApp", "Email", "Sent at", "Rejection reason"];
  const lines = rows.map((b) =>
    [
      b.reference, b.status, b.liveType, b.package.name.fr, b.package.durationMinutes, b.package.price, b.package.currency, b.day, lomeTime(b.start), lomeTime(b.end),
      b.business.name, b.business.sector, b.business.product, b.business.description, b.business.country, b.business.city,
      b.business.tiktok, b.business.instagram, b.business.facebook, b.business.website, b.business.specialRequests,
      b.contact.fullName, b.contact.whatsapp, b.contact.email, b.createdAt.toISOString(), b.rejectionReason,
    ].map(cell).join(";"),
  );
  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ocd-live-requests-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
