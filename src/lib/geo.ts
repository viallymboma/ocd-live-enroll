/** Localised country name from an ISO code (works on server and client). */
export function countryName(code: string, locale: "fr" | "en") {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
