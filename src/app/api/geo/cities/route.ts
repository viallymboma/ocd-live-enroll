import { City, Country } from "country-state-city";
import { NextResponse, type NextRequest } from "next/server";

/** Cities of one country, sorted, without duplicates. ?country=TG */
export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("country") ?? "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || !Country.getCountryByCode(code)) return NextResponse.json({ error: "country" }, { status: 400 });
  const names = [...new Set((City.getCitiesOfCountry(code) ?? []).map((c) => c.name))].sort((a, b) => a.localeCompare(b));
  return NextResponse.json(names, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
