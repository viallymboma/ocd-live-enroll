"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Check, Globe, LoaderCircle, MapPin, Pencil, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Logo } from "@/components/site/Logo";
import { Preferences } from "@/components/site/Preferences";
import { SelectField } from "@/components/ui/SelectField";
import { useCities, useCountries } from "@/hooks/useGeo";
import { useI18n } from "@/i18n/client";
import { countryName } from "@/lib/geo";
import { socialLabel, type SocialLink } from "@/lib/social";
import { formatDay, formatDuration, formatMoney, fromMinutes, toMinutes } from "@/lib/time";
import { SECTORS, type LiveType, type PackageDTO } from "@/lib/types";
import { businessSchema, contactSchema, fieldErrors } from "@/lib/validation";
import { Calendar } from "./Calendar";
import { FieldLabel, TextArea, TextField, useErrorText } from "./fields";
import { ImagePicker, type Uploaded } from "./ImagePicker";
import { NetworkBadge, SocialLinks } from "./SocialLinks";

type Business = {
  name: string; sector: string; product: string; description: string;
  /** ISO code, e.g. "TG". */
  country: string;
  city: string;
  socials: SocialLink[];
  specialRequests: string;
};
/** `dial` = ISO code of the phone's country; `phone` = the number without it. */
type Contact = { fullName: string; dial: string; phone: string; email: string };

type State = {
  step: number;
  liveType: LiveType | null;
  packageId: string | null;
  day: string | null;
  time: string | null;
  business: Business;
  contact: Contact;
  logo: Uploaded[];
  photos: Uploaded[];
};

const EMPTY: State = {
  step: 0,
  liveType: null,
  packageId: null,
  day: null,
  time: null,
  business: { name: "", sector: "", product: "", description: "", country: "TG", city: "", socials: [], specialRequests: "" },
  contact: { fullName: "", dial: "TG", phone: "", email: "" },
  logo: [],
  photos: [],
};

/** Each step has its own address: /reserver?type=online&step=business — Back/Forward and reload land on it. */
export const STEP_SLUGS = ["type", "package", "date", "business", "contact", "review"] as const;
const STORE = "ocd-booking-draft";
const LAST = 5; // review

export function BookingFlow({ packages, currency, uploadsEnabled, initialType, initialPackage, initialStep }: {
  packages: PackageDTO[];
  currency: string;
  uploadsEnabled: boolean;
  initialType: LiveType | null;
  initialPackage: string | null;
  initialStep: string | null;
}) {
  const { locale, t } = useI18n();
  const reduce = useReducedMotion();
  const [s, setS] = useState<State>(() => start(EMPTY, packages, initialType, initialPackage));
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [errorTick, setErrorTick] = useState(0);
  const [avail, setAvail] = useState<{ status: "idle" | "loading" | "ok" | "error"; days: Record<string, string[]> }>({ status: "idle", days: {} });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const countries = useCountries(locale);

  const pkg = packages.find((p) => p.id === s.packageId) ?? null;
  const offered = packages.filter((p) => !s.liveType || p.liveTypes.includes(s.liveType));

  const whatsapp = (c: Contact) => {
    const raw = c.phone.trim();
    if (raw.startsWith("+") || raw.startsWith("00")) return raw;
    const dial = countries.dialOf(c.dial);
    return dial ? `+${dial}${raw.replace(/\D/g, "").replace(/^0+/, "")}` : raw;
  };
  const businessErrors = (b: Business) => {
    const r = businessSchema.safeParse(b);
    return r.success ? {} : prefixed(fieldErrors(r.error), "business.");
  };
  const contactErrors = (c: Contact) => {
    const r = contactSchema.safeParse({ fullName: c.fullName, whatsapp: whatsapp(c), email: c.email });
    return r.success ? {} : prefixed(fieldErrors(r.error), "contact.");
  };
  /** The furthest step this state may show — a typed or old URL can never skip a required step. */
  const reachable = (st: State) => {
    const p = packages.find((x) => x.id === st.packageId);
    if (!st.liveType) return 0;
    if (!p || !p.liveTypes.includes(st.liveType)) return 1;
    if (!st.day || !st.time) return 2;
    if (Object.keys(businessErrors(st.business)).length) return 3;
    if (Object.keys(contactErrors(st.contact)).length) return 4;
    return LAST;
  };

  // ---------------------------------------------------------------- URL ⇄ step
  const urlFor = useCallback((st: State) => {
    const q = new URLSearchParams();
    if (st.liveType) q.set("type", st.liveType);
    if (st.packageId) q.set("package", st.packageId);
    q.set("step", STEP_SLUGS[st.step]);
    return `/reserver?${q}`;
  }, []);

  /** Moves to a step and records it in the address bar (push = a Back press returns here). */
  const moveTo = (next: State, opts: { push?: boolean; notice?: string | null; keepErrors?: boolean } = {}) => {
    setDir(next.step >= s.step ? 1 : -1);
    if (!opts.keepErrors) setErrors({});
    setNotice(opts.notice ?? null);
    setS(next);
    if (typeof window !== "undefined") {
      const url = urlFor(next);
      if (opts.push === false) window.history.replaceState(null, "", url);
      else if (url !== window.location.pathname + window.location.search) window.history.pushState(null, "", url);
    }
  };
  const go = (step: number, notice?: string) => moveTo({ ...s, step }, { notice });

  // Restore an unfinished request after a reload, then honour ?step= (clamped to what is filled in).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    let base = s;
    try {
      const raw = sessionStorage.getItem(STORE);
      if (raw) {
        const saved = migrate(JSON.parse(raw));
        base = initialType || initialPackage ? { ...s, business: saved.business, contact: saved.contact } : { ...saved, step: s.step };
        if (initialType && base.liveType !== initialType) base = { ...base, liveType: initialType };
      }
    } catch {}
    const wanted = STEP_SLUGS.indexOf((initialStep ?? "") as (typeof STEP_SLUGS)[number]);
    const step = wanted >= 0 ? Math.min(wanted, reachable(base)) : Math.min(base.step, reachable(base));
    const next = { ...base, step };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage + URL
    setS(next);
    window.history.replaceState(null, "", urlFor(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  // Browser Back/Forward: follow the ?step= of the new address.
  useEffect(() => {
    const onPop = () => {
      const q = new URLSearchParams(window.location.search);
      const wanted = STEP_SLUGS.indexOf((q.get("step") ?? "") as (typeof STEP_SLUGS)[number]);
      setS((cur) => {
        const step = Math.min(wanted >= 0 ? wanted : 0, reachable(cur));
        setDir(step >= cur.step ? 1 : -1);
        return { ...cur, step };
      });
      setErrors({});
      setNotice(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ ...s, logo: [], photos: [] }));
    } catch {}
  }, [s]);

  const loadAvailability = useCallback(async () => {
    if (!s.liveType || !s.packageId) return;
    setAvail({ status: "loading", days: {} });
    try {
      const res = await fetch(`/api/availability?type=${s.liveType}&package=${s.packageId}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAvail({ status: "ok", days: data.days });
    } catch {
      setAvail({ status: "error", days: {} });
    }
  }, [s.liveType, s.packageId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on entering the date step
    if (s.step === 2) loadAvailability();
  }, [s.step, loadAvailability]);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [s.step, done, reduce]);

  // After a refused "Continue"/"Submit": bring the FIRST wrong field into view and put the cursor in it.
  useEffect(() => {
    if (!errorTick) return;
    const id = requestAnimationFrame(() => {
      const root = formRef.current;
      const bad = root?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? root?.querySelector<HTMLElement>('[data-notice]');
      if (!bad) return;
      bad.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      bad.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [errorTick, reduce]);

  const fail = (errs: Record<string, string>, msg?: string) => {
    setErrors(errs);
    setNotice(msg ?? t.flow.errors.banner(Object.keys(errs).length));
    setErrorTick((n) => n + 1);
  };

  function next() {
    if (s.step === 0 && !s.liveType) return fail({}, t.flow.errors.pickType);
    if (s.step === 1 && !pkg) return fail({}, t.flow.errors.pickPackage);
    if (s.step === 2 && !(s.day && s.time)) return fail({}, s.day ? t.flow.errors.pickTime : t.flow.errors.pickDay);
    if (s.step === 3) {
      const e = businessErrors(s.business);
      if (Object.keys(e).length) return fail(e);
    }
    if (s.step === 4) {
      const e = contactErrors(s.contact);
      if (Object.keys(e).length) return fail(e);
    }
    go(s.step + 1);
  }

  async function send() {
    if (!s.liveType || !pkg || !s.day || !s.time || sending) return;
    setSending(true);
    setNotice(null);
    let res: Response;
    let data: { reference?: string; error?: string; fields?: Record<string, string> } = {};
    try {
      res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveType: s.liveType,
          packageId: pkg.id,
          day: s.day,
          time: s.time,
          business: { ...s.business, specialRequests: s.business.specialRequests || undefined },
          contact: { fullName: s.contact.fullName, whatsapp: whatsapp(s.contact), email: s.contact.email },
          uploads: { logo: s.logo[0]?.key ?? null, photos: s.photos.map((p) => p.key) },
          locale,
        }),
      });
      data = await res.json().catch(() => ({}));
    } catch {
      setSending(false);
      return fail({}, t.flow.errors.network_error);
    }
    setSending(false);

    if (res.status === 201 && data.reference) {
      setDone({ reference: data.reference });
      try {
        sessionStorage.removeItem(STORE);
      } catch {}
      return;
    }
    // Every refusal is sent back to the step and the field it concerns, in plain words.
    if (res.status === 409) {
      return moveTo({ ...s, time: null, step: 2 }, { notice: t.flow.errors["slot-taken"] });
    }
    if (res.status === 422 && data.fields) {
      const f = data.fields;
      const keys = Object.keys(f);
      const step = keys.some((k) => k === "liveType") ? 0 : keys.some((k) => k === "packageId") ? 1 : keys.some((k) => k === "day" || k === "time") ? 2 : keys.some((k) => k.startsWith("business")) ? 3 : 4;
      moveTo({ ...s, step }, { keepErrors: true });
      return fail(f);
    }
    if (res.status === 422 && data.error === "package") return moveTo({ ...s, packageId: null, day: null, time: null, step: 1 }, { notice: t.flow.errors.package });
    if (res.status === 422 && data.error === "uploads") return moveTo({ ...s, logo: [], photos: [], step: 3 }, { notice: t.flow.errors.uploads });
    if (res.status === 429) return fail({}, t.flow.errors.rate);
    fail({}, t.flow.errors.server);
  }

  const endTime = (time: string) => (pkg ? fromMinutes(toMinutes(time) + pkg.durationMinutes) : "");
  const priceLabel = (p: PackageDTO) => (p.price > 0 ? formatMoney(p.price, currency, locale) : t.packages.priceTbc);
  const typeLabel = (lt: LiveType) => (lt === "online" ? t.liveType.online : `${t.liveType.onsite} — ${t.liveType.onsiteCity}`);
  // Changing a field clears its error straight away.
  const clearError = (k: string) => setErrors((e) => (e[k] ? Object.fromEntries(Object.entries(e).filter(([x]) => x !== k)) : e));
  const setB = <K extends keyof Business>(k: K) => (v: Business[K]) => {
    clearError(`business.${k}`);
    setS((cur) => ({ ...cur, business: { ...cur.business, [k]: v } }));
  };
  const setC = (k: keyof Contact) => (v: string) => {
    clearError(`contact.${k === "phone" || k === "dial" ? "whatsapp" : k}`);
    setS((cur) => ({ ...cur, contact: { ...cur.contact, [k]: v } }));
  };
  const socialErrors = Object.fromEntries(
    Object.entries(errors).flatMap(([k, v]) => {
      const m = /^business\.socials\.(\d+)/.exec(k);
      return m ? [[Number(m[1]), v]] : [];
    }),
  );

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -40 }),
  };

  // ------------------------------------------------------------------ done
  if (done) {
    return (
      <Shell t={t}>
        <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
          <SuccessMark reduce={!!reduce} />
          <p className="kicker mt-10 text-gold">{t.flow.done.kicker}</p>
          <h1 ref={heading} tabIndex={-1} className="display mt-3 text-[clamp(2.2rem,7vw,4rem)] font-light outline-none">{t.flow.done.title}</h1>
          <p className="mt-5 text-lg text-sand">{t.flow.done.lead}</p>

          <div className="card mt-10 overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-line bg-ink-3 px-6 py-5">
              <span className="text-sm text-sand">{t.flow.done.reference}</span>
              <span className="font-mono text-2xl font-bold tracking-widest text-ember">{done.reference}</span>
            </div>
            <dl className="grid gap-4 p-6 text-sm sm:grid-cols-2">
              <Item k={t.flow.review.live} v={s.liveType ? typeLabel(s.liveType) : ""} />
              <Item k={t.flow.steps[1]} v={pkg ? `${pkg.name[locale]} · ${formatDuration(pkg.durationMinutes, locale)}` : ""} />
              <Item k={t.flow.review.slot} v={s.day && s.time ? `${formatDay(s.day, locale)} · ${s.time}–${endTime(s.time)}` : ""} />
              <Item k={t.flow.review.business} v={s.business.name} />
            </dl>
          </div>

          <h2 className="mt-10 text-sm font-bold uppercase tracking-[0.2em] text-dust">{t.flow.done.next}</h2>
          <ol className="mt-4 grid gap-3">
            {t.flow.done.nextSteps.map((x, i) => (
              <li key={i} className="flex gap-4 text-sand">
                <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-2 text-xs font-bold text-gold">{i + 1}</span>
                {x}
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-dust">{t.flow.done.email(s.contact.email)}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="btn btn-ghost">{t.flow.home}</Link>
            <button type="button" className="btn btn-ghost" onClick={() => { setDone(null); moveTo(EMPTY, { push: false }); }}>{t.flow.done.again}</button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  const reach = reachable(s);

  // ------------------------------------------------------------------ steps
  return (
    <Shell t={t}>
      {/* progress: finished steps are buttons back to them */}
      <div className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between text-xs font-semibold text-sand">
            <span>{t.flow.stepOf(s.step + 1, LAST + 1)} · <span className="text-ivory">{t.flow.steps[s.step]}</span></span>
            {pkg && <span className="hidden text-dust sm:inline">{pkg.name[locale]} · {formatDuration(pkg.durationMinutes, locale)}</span>}
          </div>
          <ol className="mt-2.5 grid grid-cols-6 gap-1.5">
            {t.flow.steps.map((label, i) => (
              <li key={i}>
                <button
                  type="button"
                  disabled={i > reach || i === s.step}
                  onClick={() => go(i)}
                  aria-label={`${i + 1}. ${label}`}
                  aria-current={i === s.step ? "step" : undefined}
                  className="group block w-full py-1.5 disabled:cursor-default"
                >
                  <span className="block h-1 overflow-hidden rounded-full bg-line">
                    <span className="block h-full origin-left rounded-full bg-ember transition-transform duration-700 ease-out-expo" style={{ transform: `scaleX(${i <= s.step ? 1 : 0})` }} />
                  </span>
                  <span className={`mt-1.5 hidden truncate text-left text-[11px] font-semibold md:block ${i === s.step ? "text-ivory" : i <= reach ? "text-sand group-hover:text-ember" : "text-dust"}`}>{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-44 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1fr_320px]">
        <div ref={formRef} className="min-w-0 overflow-x-clip">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={s.step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
              {notice && (
                <p data-notice tabIndex={-1} role="alert" className="mb-6 flex items-start gap-3 rounded-2xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm font-semibold text-ivory outline-none">
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-bad" /> {notice}
                </p>
              )}

              {s.step === 0 && (
                <Step title={t.flow.type.title} lead={t.flow.type.lead} headingRef={heading}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(["online", "onsite"] as LiveType[]).map((lt) => (
                      <button
                        key={lt}
                        type="button"
                        aria-pressed={s.liveType === lt}
                        onClick={() => {
                          const keep = s.packageId && packages.find((p) => p.id === s.packageId)?.liveTypes.includes(lt);
                          moveTo({ ...s, liveType: lt, packageId: keep ? s.packageId : null, day: null, time: null, step: keep ? 2 : 1 });
                        }}
                        className="choice flex min-h-44 flex-col justify-between p-6 text-left"
                      >
                        <span className="grid size-12 place-items-center rounded-full bg-ink-3 text-gold ring-1 ring-line-2">
                          {lt === "online" ? <Globe className="size-6" /> : <MapPin className="size-6" />}
                        </span>
                        <span>
                          <span className="display block text-3xl">{lt === "online" ? t.liveType.online : <>{t.liveType.onsite} <span className="italic text-ember">— {t.liveType.onsiteCity}</span></>}</span>
                          <span className="mt-1 block text-sm text-sand">{lt === "online" ? t.liveType.onlineHint : t.liveType.onsiteHint}</span>
                        </span>
                        {s.liveType === lt && <SelectedTick />}
                      </button>
                    ))}
                  </div>
                </Step>
              )}

              {s.step === 1 && (
                <Step title={t.flow.package.title} lead={t.flow.package.lead} headingRef={heading}>
                  {offered.length === 0 ? (
                    <p className="text-sand">{t.flow.package.none}</p>
                  ) : (
                    <div className="grid gap-3">
                      {offered.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          aria-pressed={s.packageId === p.id}
                          onClick={() => moveTo({ ...s, packageId: p.id, day: s.packageId === p.id ? s.day : null, time: s.packageId === p.id ? s.time : null, step: 2 })}
                          className="choice grid gap-3 p-5 text-left sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
                        >
                          <span>
                            <span className="flex flex-wrap items-center gap-2 pr-8">
                              <span className="display text-2xl sm:text-3xl">{p.name[locale]}</span>
                              <span className="rounded-full bg-ember/15 px-2.5 py-0.5 text-xs font-bold text-ember">{formatDuration(p.durationMinutes, locale)}</span>
                              {p.placeholder && <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold">{t.packages.tbcBadge}</span>}
                            </span>
                            <span className="mt-2 block text-sm text-sand">{p.description[locale]}</span>
                            <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-sand">
                              {p.deliverables[locale].map((d) => <span key={d} className="before:mr-1.5 before:text-gold before:content-['✦']">{d}</span>)}
                            </span>
                          </span>
                          <span className={p.price > 0 ? "display text-2xl text-ivory sm:text-right" : "text-sm font-semibold text-gold sm:text-right"}>{priceLabel(p)}</span>
                          {s.packageId === p.id && <SelectedTick />}
                        </button>
                      ))}
                    </div>
                  )}
                </Step>
              )}

              {s.step === 2 && (
                <Step title={t.flow.date.title} lead={t.flow.date.lead} headingRef={heading}>
                  {avail.status === "loading" && (
                    <p className="flex items-center gap-3 text-sand"><LoaderCircle className="size-5 animate-spin text-gold" /> {t.flow.date.loading}</p>
                  )}
                  {avail.status === "error" && (
                    <div className="flex flex-wrap items-center gap-4"><p className="text-sand">{t.flow.date.error}</p><button type="button" className="btn btn-ghost" onClick={loadAvailability}>{t.flow.date.retry}</button></div>
                  )}
                  {avail.status === "ok" && Object.keys(avail.days).length === 0 && <p className="text-sand">{t.flow.date.none}</p>}
                  {avail.status === "ok" && Object.keys(avail.days).length > 0 && (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                      <Calendar available={avail.days} value={s.day} onChange={(day) => { setNotice(null); setS((cur) => ({ ...cur, day, time: null })); }} />
                      <div>
                        <p className="label mb-3">{t.flow.date.times}<span className="req" aria-hidden>*</span></p>
                        {!s.day ? (
                          <p className="text-sm text-dust">{t.flow.date.pickDay}</p>
                        ) : (
                          <motion.div key={s.day} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-3" role="group" aria-label={t.flow.date.times}>
                            {(avail.days[s.day] ?? []).map((time) => (
                              <button
                                key={time}
                                type="button"
                                aria-pressed={s.time === time}
                                onClick={() => { setNotice(null); setS((cur) => ({ ...cur, time })); }}
                                className={`rounded-xl border px-2 py-3 text-center transition duration-300 ease-out-expo ${s.time === time ? "border-ember bg-ember text-on-ember" : "border-line bg-ink-2 text-ivory hover:border-line-2"}`}
                              >
                                <span className="block text-base font-bold">{time}</span>
                                <span className={`block text-[10px] ${s.time === time ? "opacity-75" : "text-dust"}`}>{t.flow.date.ends(endTime(time))}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </Step>
              )}

              {s.step === 3 && (
                <Step title={t.flow.business.title} lead={t.flow.business.lead} headingRef={heading}>
                  <p className="hint -mt-4 mb-6"><span className="req" aria-hidden>*</span> {t.flow.requiredLegend}</p>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField label={t.flow.business.name} required value={s.business.name} onChange={setB("name")} error={errors["business.name"]} autoComplete="organization" maxLength={120} />
                    <SelectField
                      label={t.flow.business.sector}
                      required
                      value={s.business.sector}
                      onChange={setB("sector")}
                      error={errors["business.sector"]}
                      placeholder={t.flow.business.sectorPick}
                      options={SECTORS.map((k) => ({ value: k, label: t.sectors[k] }))}
                    />
                    <div className="sm:col-span-2">
                      <TextField label={t.flow.business.product} required value={s.business.product} onChange={setB("product")} error={errors["business.product"]} maxLength={160} />
                    </div>
                    <div className="sm:col-span-2">
                      <TextArea label={t.flow.business.description} required hint={t.flow.business.descriptionHint} value={s.business.description} onChange={setB("description")} error={errors["business.description"]} maxLength={1500} />
                    </div>
                    <SelectField
                      label={t.geo.country}
                      required
                      value={s.business.country}
                      onChange={(v) => {
                        clearError("business.country");
                        clearError("business.city");
                        setS((cur) => ({
                          ...cur,
                          business: { ...cur.business, country: v, city: v === cur.business.country ? cur.business.city : "" },
                          // the phone's country follows, until the client picks another one
                          contact: cur.contact.phone ? cur.contact : { ...cur.contact, dial: v || cur.contact.dial },
                        }));
                      }}
                      error={errors["business.country"]}
                      options={countries.country}
                      loading={countries.loading}
                      hint={countries.error ? t.geo.loadError : undefined}
                    />
                    <CityField country={s.business.country} value={s.business.city} onChange={setB("city")} error={errors["business.city"]} />
                  </div>

                  <div className="mt-10 border-t border-line pt-8">
                    <SocialLinks
                      value={s.business.socials}
                      errors={socialErrors}
                      onChange={(v) => {
                        setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith("business.socials"))));
                        setS((cur) => ({ ...cur, business: { ...cur.business, socials: v } }));
                      }}
                    />
                  </div>

                  <div className="mt-10 border-t border-line pt-8">
                    <p className="label">{t.flow.business.more}</p>
                    <div className="mt-4 grid gap-5 sm:grid-cols-2">
                      {uploadsEnabled ? (
                        <>
                          <ImagePicker label={t.flow.business.logo} max={1} items={s.logo} onChange={(logo) => setS((cur) => ({ ...cur, logo }))} />
                          <ImagePicker label={t.flow.business.photos} max={5} items={s.photos} onChange={(photos) => setS((cur) => ({ ...cur, photos }))} />
                        </>
                      ) : (
                        <p className="hint sm:col-span-2">{t.flow.business.uploadsOff}</p>
                      )}
                      <div className="sm:col-span-2">
                        <TextArea label={t.flow.business.special} rows={3} value={s.business.specialRequests} onChange={setB("specialRequests")} error={errors["business.specialRequests"]} maxLength={1000} />
                      </div>
                    </div>
                  </div>
                </Step>
              )}

              {s.step === 4 && (
                <Step title={t.flow.contact.title} lead={t.flow.contact.lead} headingRef={heading}>
                  <p className="hint -mt-4 mb-6"><span className="req" aria-hidden>*</span> {t.flow.requiredLegend}</p>
                  <div className="grid max-w-xl gap-5">
                    <TextField label={t.flow.contact.fullName} required value={s.contact.fullName} onChange={setC("fullName")} error={errors["contact.fullName"]} autoComplete="name" maxLength={120} />
                    <PhoneField
                      dial={s.contact.dial}
                      phone={s.contact.phone}
                      onDial={setC("dial")}
                      onPhone={setC("phone")}
                      error={errors["contact.whatsapp"]}
                      options={countries.dial}
                      dialOf={countries.dialOf}
                      loading={countries.loading}
                    />
                    <TextField label={t.flow.contact.email} required value={s.contact.email} onChange={setC("email")} error={errors["contact.email"]} type="email" inputMode="email" autoComplete="email" maxLength={160} />
                  </div>
                </Step>
              )}

              {s.step === LAST && pkg && s.liveType && s.day && s.time && (
                <Step title={t.flow.review.title} lead={t.flow.review.lead} headingRef={heading}>
                  <div className="grid gap-4">
                    <ReviewBlock title={t.flow.review.liveAndPackage} onEdit={() => go(0)} edit={t.flow.review.edit}>
                      <Item k={t.flow.review.live} v={typeLabel(s.liveType)} />
                      <Item k={t.flow.steps[1]} v={pkg.name[locale]} />
                      <Item k={t.flow.review.duration} v={formatDuration(pkg.durationMinutes, locale)} />
                      <Item k={t.flow.review.price} v={priceLabel(pkg)} />
                    </ReviewBlock>
                    <ReviewBlock title={t.flow.review.slot} onEdit={() => go(2)} edit={t.flow.review.edit}>
                      <Item k={t.flow.steps[2]} v={formatDay(s.day, locale)} />
                      <Item k={t.flow.review.time} v={`${s.time} – ${endTime(s.time)} (Lomé)`} />
                    </ReviewBlock>
                    <ReviewBlock title={t.flow.review.business} onEdit={() => go(3)} edit={t.flow.review.edit}>
                      <Item k={t.flow.business.name} v={s.business.name} />
                      <Item k={t.flow.business.sector} v={t.sectors[s.business.sector as keyof typeof t.sectors] ?? ""} />
                      <Item k={t.flow.business.product} v={s.business.product} wide />
                      <Item k={t.flow.business.description} v={s.business.description} wide />
                      <Item k={`${t.geo.city}, ${t.geo.country}`} v={`${s.business.city}, ${countryName(s.business.country, locale)}`} wide />
                      {s.business.socials.length > 0 && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs font-semibold uppercase tracking-wider text-dust">{t.social.title}</dt>
                          <dd className="mt-2 flex flex-wrap gap-2">
                            {s.business.socials.map((x) => (
                              <span key={x.url} className="inline-flex items-center gap-2 rounded-full border border-line-2 py-1 pl-1 pr-3 text-sm text-ivory">
                                <NetworkBadge network={x.network} size={24} /> {socialLabel(x.url)}
                              </span>
                            ))}
                          </dd>
                        </div>
                      )}
                      {(s.logo.length > 0 || s.photos.length > 0) && (
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                          {[...s.logo, ...s.photos].map((p) => (
                            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                            <img key={p.key} src={p.preview} alt="" className="size-14 rounded-xl object-cover" />
                          ))}
                        </div>
                      )}
                      {s.business.specialRequests && <Item k={t.flow.business.special} v={s.business.specialRequests} wide />}
                    </ReviewBlock>
                    <ReviewBlock title={t.flow.review.contact} onEdit={() => go(4)} edit={t.flow.review.edit}>
                      <Item k={t.flow.contact.fullName} v={s.contact.fullName} />
                      <Item k={t.flow.contact.whatsapp} v={whatsapp(s.contact)} />
                      <Item k={t.flow.contact.email} v={s.contact.email} />
                    </ReviewBlock>
                    <p className="text-sm text-dust">{t.flow.review.notice}</p>
                  </div>
                </Step>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* the selection, always visible on desktop */}
        <aside className="hidden lg:block">
          <div className="card sticky top-32 p-6">
            <Logo className="h-8 w-auto text-ivory" />
            <dl className="mt-6 grid gap-4 text-sm">
              <Item k={t.flow.review.live} v={s.liveType ? typeLabel(s.liveType) : "—"} />
              <Item k={t.flow.steps[1]} v={pkg ? pkg.name[locale] : "—"} />
              {pkg && <Item k={t.flow.review.duration} v={formatDuration(pkg.durationMinutes, locale)} />}
              {pkg && <Item k={t.flow.review.price} v={priceLabel(pkg)} />}
              <Item k={t.flow.review.slot} v={s.day && s.time ? `${formatDay(s.day, locale, { weekday: "short", day: "numeric", month: "short" })} · ${s.time}` : "—"} />
            </dl>
          </div>
        </aside>
      </div>

      {/* action bar — never wider than the screen: Back shrinks to an arrow on phones, labels truncate */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        {pkg && (
          <p className="mx-auto max-w-6xl truncate px-4 pt-2 text-xs text-dust sm:px-8 lg:hidden">
            {s.liveType ? `${s.liveType === "online" ? t.liveType.onlineShort : t.liveType.onsiteShort} · ` : ""}{pkg.name[locale]} · {formatDuration(pkg.durationMinutes, locale)} · {priceLabel(pkg)}{s.day && s.time ? ` · ${s.day.slice(8)}/${s.day.slice(5, 7)} ${s.time}` : ""}
          </p>
        )}
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:justify-between sm:px-8 sm:py-4">
          {s.step > 0 ? (
            <button type="button" onClick={() => go(s.step - 1)} aria-label={t.flow.back} className="btn btn-ghost shrink-0 px-4 sm:px-6"><ArrowLeft className="size-4" /> <span className="hidden sm:inline">{t.flow.back}</span></button>
          ) : (
            <Link href="/" aria-label={t.flow.home} className="btn btn-ghost shrink-0 px-4 sm:px-6"><ArrowLeft className="size-4" /> <span className="hidden sm:inline">{t.flow.home}</span></Link>
          )}
          {s.step < LAST ? (
            <button type="button" onClick={next} className="btn btn-primary min-w-0 flex-1 sm:flex-none sm:min-w-44">
              <span className="truncate">{t.flow.next}</span> <ArrowRight className="size-4 shrink-0" />
            </button>
          ) : (
            <button type="button" onClick={send} disabled={sending} className="btn btn-primary min-w-0 flex-1 sm:flex-none sm:min-w-44">
              {sending ? <><LoaderCircle className="size-4 shrink-0 animate-spin" /> <span className="truncate">{t.flow.review.sending}</span></> : <><span className="truncate">{t.flow.review.submit}</span> <ArrowRight className="size-4 shrink-0" /></>}
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}

// ------------------------------------------------------------------ fields

/** City list of the chosen country (searchable, bottom sheet on phones). A town missing from the list can be typed. */
function CityField({ country, value, onChange, error }: { country: string; value: string; onChange: (v: string) => void; error?: string }) {
  const { t } = useI18n();
  const cities = useCities(country);
  const empty = !cities.loading && !cities.error && country && cities.options.length === 0;
  if (empty || cities.error) {
    return <TextField label={t.geo.city} required value={value} onChange={onChange} error={error} autoComplete="address-level2" maxLength={80} hint={cities.error ? t.geo.loadError : undefined} />;
  }
  return (
    <SelectField
      label={t.geo.city}
      required
      value={value}
      onChange={onChange}
      error={error}
      options={cities.options}
      loading={cities.loading}
      disabled={!country}
      placeholder={country ? t.ui.choose : t.geo.pickCountryFirst}
      searchThreshold={0}
      emptyAction={{ label: t.geo.useCity, onSelect: onChange }}
    />
  );
}

/** WhatsApp: country code (searchable list, shows "🇹🇬 +228") + the number. */
function PhoneField({ dial, phone, onDial, onPhone, error, options, dialOf, loading }: {
  dial: string; phone: string; onDial: (v: string) => void; onPhone: (v: string) => void; error?: string;
  options: { value: string; label: string; leading?: React.ReactNode; hint?: string }[];
  dialOf: (code: string) => string; loading: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const msg = useErrorText(error);
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={t.flow.contact.whatsapp} required />
      <div className="grid grid-cols-[8.5rem_1fr] gap-2">
        <SelectField
          label={t.geo.dialCode}
          sheetTitle={t.geo.dialCode}
          hideLabel
          required
          value={dial}
          onChange={onDial}
          options={options}
          loading={loading}
          display={(o) => <span className="flex items-center gap-2"><span className="text-lg leading-none">{o.leading}</span><span className="font-semibold tabular-nums">+{dialOf(o.value)}</span></span>}
        />
        <input
          id={id}
          className="input tabular-nums"
          value={phone}
          onChange={(e) => onPhone(e.target.value)}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="90 00 00 00"
          aria-invalid={msg ? true : undefined}
          aria-required
          aria-describedby={`${id}-m`}
        />
      </div>
      <p id={`${id}-m`} className={msg ? "error" : "hint"} role={msg ? "alert" : undefined}>{msg ?? t.flow.contact.whatsappHint}</p>
    </div>
  );
}

// ------------------------------------------------------------------ helpers

function prefixed(e: Record<string, string>, p: string) {
  return Object.fromEntries(Object.entries(e).map(([k, v]) => [p + k, v]));
}

/** A draft saved by an older version of the form (free-text country, one field per network) still loads. */
function migrate(raw: Partial<State> & { business?: Record<string, unknown>; contact?: Record<string, unknown> }): State {
  const b: Record<string, unknown> = raw.business ?? {};
  const c: Record<string, unknown> = raw.contact ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const country = /^[A-Z]{2}$/.test(str(b.country)) ? str(b.country) : "TG";
  return {
    ...EMPTY,
    step: typeof raw.step === "number" ? raw.step : 0,
    liveType: raw.liveType === "online" || raw.liveType === "onsite" ? raw.liveType : null,
    packageId: typeof raw.packageId === "string" ? raw.packageId : null,
    day: typeof raw.day === "string" ? raw.day : null,
    time: typeof raw.time === "string" ? raw.time : null,
    business: {
      name: str(b.name), sector: str(b.sector), product: str(b.product), description: str(b.description),
      country, city: country === b.country ? str(b.city) : "",
      socials: Array.isArray(b.socials) ? (b.socials as SocialLink[]) : [],
      specialRequests: str(b.specialRequests),
    },
    contact: { fullName: str(c.fullName), dial: /^[A-Z]{2}$/.test(str(c.dial)) ? str(c.dial) : country, phone: str(c.phone) || str(c.whatsapp), email: str(c.email) },
  };
}

/** Apply ?type= / ?package= from the landing page. */
function start(base: State, packages: PackageDTO[], type: LiveType | null, packageId: string | null): State {
  const pkg = packages.find((p) => p.id === packageId);
  const liveType = type ?? (pkg && pkg.liveTypes.length === 1 ? pkg.liveTypes[0] : null);
  if (pkg && liveType && pkg.liveTypes.includes(liveType)) return { ...base, liveType, packageId: pkg.id, step: 2 };
  if (liveType) return { ...base, liveType, packageId: pkg?.id ?? null, step: 1 };
  return { ...base, packageId: pkg?.id ?? null, step: 0 };
}

function Shell({ t, children }: { t: ReturnType<typeof useI18n>["t"]; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link href="/" className="text-ivory" aria-label="OCD Live"><Logo className="h-8 w-auto" /></Link>
          <div className="flex items-center gap-2">
            <Preferences />
            <Link href="/" aria-label={t.flow.home} className="grid size-10 place-items-center rounded-full border border-line text-sand hover:text-ivory"><X className="size-4" /></Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function Step({ title, lead, headingRef, children }: { title: string; lead: string; headingRef: React.RefObject<HTMLHeadingElement | null>; children: React.ReactNode }) {
  return (
    <section>
      <h1 ref={headingRef} tabIndex={-1} className="display text-[clamp(2rem,6vw,3.6rem)] font-light outline-none">{title}</h1>
      <p className="mb-8 mt-3 max-w-xl text-sand">{lead}</p>
      {children}
    </section>
  );
}

function SelectedTick() {
  return (
    <span className="absolute right-4 top-4 grid size-7 place-items-center rounded-full bg-ember text-on-ember">
      <Check className="size-4" strokeWidth={3} />
    </span>
  );
}

function Item({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wider text-dust">{k}</dt>
      <dd className="mt-1 whitespace-pre-line break-words text-ivory">{v}</dd>
    </div>
  );
}

function ReviewBlock({ title, edit, onEdit, children }: { title: string; edit: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gold">{title}</h2>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-xs font-semibold text-sand hover:border-sand hover:text-ivory">
          <Pencil className="size-3" /> {edit}
        </button>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

/** Success: a ring draws itself, then the tick, then a soft burst. */
function SuccessMark({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative size-24">
      {!reduce && <span className="absolute inset-0 animate-pulse-ring rounded-full border border-ember" />}
      <svg viewBox="0 0 96 96" className="size-24">
        <motion.circle cx="48" cy="48" r="44" fill="none" stroke="var(--ember)" strokeWidth="4" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.83, 0, 0.17, 1] }} />
        <motion.path d="M30 49 l12 12 l24 -26" fill="none" stroke="var(--ivory)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
    </div>
  );
}
