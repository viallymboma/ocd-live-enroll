"use client";

import { useEffect, useMemo, useState } from "react";

import type { SelectOption } from "@/components/ui/SelectField";

type Country = { code: string; name: string; dial: string; flag: string };
let countriesCache: Promise<Country[]> | null = null;
const citiesCache = new Map<string, Promise<string[]>>();

function getCountries() {
  countriesCache ??= fetch("/api/geo/countries").then((r) => {
    if (!r.ok) throw new Error("geo");
    return r.json();
  }).catch((e) => {
    countriesCache = null;
    throw e;
  });
  return countriesCache;
}

function getCities(code: string) {
  if (!citiesCache.has(code)) {
    citiesCache.set(code, fetch(`/api/geo/cities?country=${code}`).then((r) => {
      if (!r.ok) throw new Error("geo");
      return r.json();
    }).catch((e) => {
      citiesCache.delete(code);
      throw e;
    }));
  }
  return citiesCache.get(code)!;
}

/** Countries with names in the visitor's language; Togo first, then West/Central Africa neighbours, then A→Z. */
export function useCountries(locale: "fr" | "en") {
  const [list, setList] = useState<Country[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    getCountries().then(setList).catch(() => setError(true));
  }, []);
  const options = useMemo<{ country: SelectOption[]; dial: SelectOption[] }>(() => {
    if (!list) return { country: [], dial: [] };
    const names = new Intl.DisplayNames([locale], { type: "region" });
    const named = list.map((c) => ({ ...c, label: names.of(c.code) ?? c.name }));
    const TOP = ["TG", "BJ", "GH", "CI", "BF", "NG", "SN", "CM", "FR"];
    named.sort((a, b) => {
      const ia = TOP.indexOf(a.code), ib = TOP.indexOf(b.code);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.label.localeCompare(b.label, locale);
    });
    return {
      country: named.map((c) => ({ value: c.code, label: c.label, leading: c.flag, keywords: `${c.name} ${c.code}` })),
      dial: named.map((c) => ({ value: c.code, label: c.label, leading: c.flag, hint: `+${c.dial}`, keywords: `${c.name} ${c.dial} +${c.dial}` })),
    };
  }, [list, locale]);
  const dialOf = (code: string) => list?.find((c) => c.code === code)?.dial ?? "";
  return { ...options, loading: !list && !error, error, dialOf, retry: () => { setError(false); getCountries().then(setList).catch(() => setError(true)); } };
}

export function useCities(code: string) {
  const [state, setState] = useState<{ code: string; names: string[] | null; error: boolean }>({ code: "", names: null, error: false });
  useEffect(() => {
    if (!code) return;
    let alive = true;
    getCities(code)
      .then((names) => alive && setState({ code, names, error: false }))
      .catch(() => alive && setState({ code, names: null, error: true }));
    return () => {
      alive = false;
    };
  }, [code]);
  const ready = state.code === code;
  const options = useMemo<SelectOption[]>(() => (ready && state.names ? state.names.map((n) => ({ value: n, label: n })) : []), [ready, state.names]);
  return { options, loading: Boolean(code) && !ready, error: ready && state.error };
}

export { countryName } from "@/lib/geo";
