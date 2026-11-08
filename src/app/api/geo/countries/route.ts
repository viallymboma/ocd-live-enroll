import { Country } from "country-state-city";
import { NextResponse } from "next/server";

/** All countries: ISO code, dial code, flag. Names are localised in the browser (Intl.DisplayNames). */
export async function GET() {
  const list = Country.getAllCountries().map((c) => ({ code: c.isoCode, name: c.name, dial: c.phonecode.replace(/^\+/, "").split(/[ ,-]/)[0], flag: c.flag }));
  return NextResponse.json(list, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
