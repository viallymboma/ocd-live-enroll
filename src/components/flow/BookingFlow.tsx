"use client";

import { ArrowLeft, ArrowRight, Check, Globe, LoaderCircle, MapPin, Pencil, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Logo } from "@/components/site/Logo";
import { LangToggle } from "@/components/site/LangToggle";
import { useI18n } from "@/i18n/client";
import { formatDay, formatDuration, formatMoney, fromMinutes, toMinutes } from "@/lib/time";
import { SECTORS, type LiveType, type PackageDTO } from "@/lib/types";
import { businessSchema, contactSchema, fieldErrors } from "@/lib/validation";
import { Calendar } from "./Calendar";
import { SelectField, TextArea, TextField } from "./fields";
import { ImagePicker, type Uploaded } from "./ImagePicker";

type Business = {
  name: string; sector: string; product: string; description: string; country: string; city: string;
  tiktok: string; instagram: string; facebook: string; website: string; specialRequests: string;
};
type Contact = { fullName: string; whatsapp: string; email: string };

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
  business: { name: "", sector: "", product: "", description: "", country: "Togo", city: "", tiktok: "", instagram: "", facebook: "", website: "", specialRequests: "" },
  contact: { fullName: "", whatsapp: "", email: "" },
  logo: [],
  photos: [],
};

const STORE = "ocd-booking-draft";
const LAST = 5; // review

export function BookingFlow({ packages, currency, uploadsEnabled, initialType, initialPackage }: {
  packages: PackageDTO[];
  currency: string;
  uploadsEnabled: boolean;
  initialType: LiveType | null;
  initialPackage: string | null;
}) {
  const { locale, t } = useI18n();
  const reduce = useReducedMotion();
  const [s, setS] = useState<State>(() => start(EMPTY, packages, initialType, initialPackage));
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [avail, setAvail] = useState<{ status: "idle" | "loading" | "ok" | "error"; days: Record<string, string[]> }>({ status: "idle", days: {} });
  const [submit, setSubmit] = useState<{ status: "idle" | "sending" | "error"; message?: string }>({ status: "idle" });
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const [showMore, setShowMore] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);

  // Restore an unfinished request after a reload (URL choices win). Photos' previews are not kept.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      const saved = JSON.parse(raw) as State;
      if (initialType || initialPackage) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage
        setS((cur) => ({ ...cur, business: saved.business ?? cur.business, contact: saved.contact ?? cur.contact }));
      } else {
        setS({ ...EMPTY, ...saved, logo: [], photos: [] });
      }
    } catch {}
  }, [initialType, initialPackage]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify({ ...s, logo: [], photos: [] }));
    } catch {}
  }, [s]);

  const pkg = packages.find((p) => p.id === s.packageId) ?? null;
  const offered = packages.filter((p) => !s.liveType || p.liveTypes.includes(s.liveType));

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

  const go = (step: number) => {
    setDir(step > s.step ? 1 : -1);
    setErrors({});
    setS((cur) => ({ ...cur, step }));
  };

  function validateStep(): boolean {
    if (s.step === 3) {
      const r = businessSchema.safeParse(s.business);
      if (!r.success) {
        setErrors(fieldErrors(r.error));
        const optionalBad = Object.keys(fieldErrors(r.error)).some((k) => ["tiktok", "instagram", "facebook", "website", "specialRequests"].includes(k));
        if (optionalBad) setShowMore(true);
        return false;
      }
    }
    if (s.step === 4) {
      const r = contactSchema.safeParse(s.contact);
      if (!r.success) {
        setErrors(fieldErrors(r.error));
        return false;
      }
    }
    return true;
  }

  const canNext = [Boolean(s.liveType), Boolean(pkg), Boolean(s.day && s.time), true, true][s.step] ?? true;
  const next = () => {
    if (!validateStep()) return;
    go(s.step + 1);
  };

  async function send() {
    if (!s.liveType || !pkg || !s.day || !s.time) return;
    setSubmit({ status: "sending" });
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveType: s.liveType,
          packageId: pkg.id,
          day: s.day,
          time: s.time,
          business: s.business,
          contact: s.contact,
          uploads: { logo: s.logo[0]?.key ?? null, photos: s.photos.map((p) => p.key) },
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) {
        setDone({ reference: data.reference });
        try {
          sessionStorage.removeItem(STORE);
        } catch {}
        return;
      }
      if (res.status === 409) {
        setS((cur) => ({ ...cur, time: null, step: 2 }));
        setDir(-1);
        setSubmit({ status: "error", message: t.flow.review.taken });
        return;
      }
      if (res.status === 422 && data.fields) {
        const f = data.fields as Record<string, string>;
        const toStep = Object.keys(f).some((k) => k.startsWith("business")) ? 3 : 4;
        setErrors(Object.fromEntries(Object.entries(f).map(([k, v]) => [k.split(".").slice(1).join("."), v])));
        setS((cur) => ({ ...cur, step: toStep }));
        setSubmit({ status: "idle" });
        return;
      }
      setSubmit({ status: "error", message: t.flow.review.failed });
    } catch {
      setSubmit({ status: "error", message: t.flow.review.failed });
    }
  }

  const endTime = (time: string) => (pkg ? fromMinutes(toMinutes(time) + pkg.durationMinutes) : "");
  const priceLabel = (p: PackageDTO) => (p.price > 0 ? formatMoney(p.price, currency, locale) : t.packages.priceTbc);
  const typeLabel = (lt: LiveType) => (lt === "online" ? t.liveType.online : `${t.liveType.onsite} — ${t.liveType.onsiteCity}`);
  // Typing in a field clears its error straight away.
  const clearError = (k: string) => setErrors((e) => (e[k] ? Object.fromEntries(Object.entries(e).filter(([x]) => x !== k)) : e));
  const setB = (k: keyof Business) => (v: string) => {
    clearError(k);
    setS((cur) => ({ ...cur, business: { ...cur.business, [k]: v } }));
  };
  const setC = (k: keyof Contact) => (v: string) => {
    clearError(k);
    setS((cur) => ({ ...cur, contact: { ...cur.contact, [k]: v } }));
  };

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
            <button type="button" className="btn btn-ghost" onClick={() => { setDone(null); setS(EMPTY); setSubmit({ status: "idle" }); }}>{t.flow.done.again}</button>
          </div>
        </motion.div>
      </Shell>
    );
  }

  // ------------------------------------------------------------------ steps
  return (
    <Shell t={t}>
      {/* progress */}
      <div className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-8">
          <div className="flex items-center justify-between text-xs font-semibold text-sand">
            <span>{t.flow.stepOf(s.step + 1, LAST + 1)} · <span className="text-ivory">{t.flow.steps[s.step]}</span></span>
            {pkg && <span className="hidden text-dust sm:inline">{pkg.name[locale]} · {formatDuration(pkg.durationMinutes, locale)}</span>}
          </div>
          <div className="mt-2.5 grid grid-cols-6 gap-1.5" aria-hidden>
            {t.flow.steps.map((_, i) => (
              <span key={i} className="h-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full origin-left rounded-full bg-ember transition-transform duration-700 ease-out-expo" style={{ transform: `scaleX(${i <= s.step ? 1 : 0})` }} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-40 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {submit.status === "error" && s.step !== LAST && (
            <p role="alert" className="mb-6 rounded-2xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-ivory">{submit.message}</p>
          )}
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div key={s.step} custom={dir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
              {s.step === 0 && (
                <Step title={t.flow.type.title} lead={t.flow.type.lead} headingRef={heading}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(["online", "onsite"] as LiveType[]).map((lt) => (
                      <button
                        key={lt}
                        type="button"
                        aria-pressed={s.liveType === lt}
                        onClick={() => {
                          setS((cur) => {
                            const keep = cur.packageId && packages.find((p) => p.id === cur.packageId)?.liveTypes.includes(lt);
                            return { ...cur, liveType: lt, packageId: keep ? cur.packageId : null, day: null, time: null, step: keep ? 2 : 1 };
                          });
                          setDir(1);
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
                          onClick={() => {
                            setS((cur) => ({ ...cur, packageId: p.id, day: cur.packageId === p.id ? cur.day : null, time: cur.packageId === p.id ? cur.time : null, step: 2 }));
                            setDir(1);
                          }}
                          className="choice grid gap-3 p-5 text-left sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
                        >
                          <span>
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="display text-2xl sm:text-3xl">{p.name[locale]}</span>
                              <span className="rounded-full bg-ember/15 px-2.5 py-0.5 text-xs font-bold text-ember-2">{formatDuration(p.durationMinutes, locale)}</span>
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
                    <div className="flex items-center gap-4"><p className="text-sand">{t.flow.date.error}</p><button type="button" className="btn btn-ghost" onClick={loadAvailability}>{t.flow.date.retry}</button></div>
                  )}
                  {avail.status === "ok" && Object.keys(avail.days).length === 0 && <p className="text-sand">{t.flow.date.none}</p>}
                  {avail.status === "ok" && Object.keys(avail.days).length > 0 && (
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
                      <Calendar available={avail.days} value={s.day} onChange={(day) => setS((cur) => ({ ...cur, day, time: null }))} />
                      <div>
                        <p className="label mb-3">{t.flow.date.times}</p>
                        {!s.day ? (
                          <p className="text-sm text-dust">{t.flow.date.pickDay}</p>
                        ) : (
                          <motion.div key={s.day} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-3" role="group" aria-label={t.flow.date.times}>
                            {(avail.days[s.day] ?? []).map((time) => (
                              <button
                                key={time}
                                type="button"
                                aria-pressed={s.time === time}
                                onClick={() => setS((cur) => ({ ...cur, time }))}
                                className={`rounded-xl border px-2 py-3 text-center transition duration-300 ease-out-expo ${s.time === time ? "border-ember bg-ember text-ink" : "border-line bg-ink-2 text-ivory hover:border-line-2"}`}
                              >
                                <span className="block text-base font-bold">{time}</span>
                                <span className={`block text-[10px] ${s.time === time ? "text-ink/70" : "text-dust"}`}>{t.flow.date.ends(endTime(time))}</span>
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
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField label={t.flow.business.name} required value={s.business.name} onChange={setB("name")} error={errors.name} autoComplete="organization" maxLength={120} />
                    <SelectField label={t.flow.business.sector} required value={s.business.sector} onChange={setB("sector")} error={errors.sector} placeholder={t.flow.business.sectorPick} options={SECTORS.map((k) => [k, t.sectors[k]])} />
                    <div className="sm:col-span-2">
                      <TextField label={t.flow.business.product} required value={s.business.product} onChange={setB("product")} error={errors.product} maxLength={160} />
                    </div>
                    <div className="sm:col-span-2">
                      <TextArea label={t.flow.business.description} required hint={t.flow.business.descriptionHint} value={s.business.description} onChange={setB("description")} error={errors.description} maxLength={1500} />
                    </div>
                    <TextField label={t.flow.business.country} required value={s.business.country} onChange={setB("country")} error={errors.country} autoComplete="country-name" />
                    <TextField label={t.flow.business.city} required value={s.business.city} onChange={setB("city")} error={errors.city} autoComplete="address-level2" />
                  </div>

                  <div className="mt-8 border-t border-line pt-6">
                    <button type="button" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} className="flex w-full items-center justify-between text-left text-sm font-semibold text-ivory">
                      {t.flow.business.more}
                      <span className={`grid size-8 place-items-center rounded-full border border-line-2 transition-transform duration-300 ${showMore ? "rotate-45" : ""}`}>+</span>
                    </button>
                    <AnimatePresence initial={false}>
                      {showMore && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden">
                          <div className="grid gap-5 pt-6 sm:grid-cols-2">
                            <TextField label={t.flow.business.tiktok} value={s.business.tiktok} onChange={setB("tiktok")} error={errors.tiktok} placeholder="tiktok.com/@…" inputMode="url" />
                            <TextField label={t.flow.business.instagram} value={s.business.instagram} onChange={setB("instagram")} error={errors.instagram} placeholder="instagram.com/…" inputMode="url" />
                            <TextField label={t.flow.business.facebook} value={s.business.facebook} onChange={setB("facebook")} error={errors.facebook} placeholder="facebook.com/…" inputMode="url" />
                            <TextField label={t.flow.business.website} value={s.business.website} onChange={setB("website")} error={errors.website} placeholder="www…" inputMode="url" />
                            {uploadsEnabled ? (
                              <>
                                <ImagePicker label={t.flow.business.logo} max={1} items={s.logo} onChange={(logo) => setS((cur) => ({ ...cur, logo }))} />
                                <ImagePicker label={t.flow.business.photos} max={5} items={s.photos} onChange={(photos) => setS((cur) => ({ ...cur, photos }))} />
                              </>
                            ) : (
                              <p className="hint sm:col-span-2">{t.flow.business.uploadsOff}</p>
                            )}
                            <div className="sm:col-span-2">
                              <TextArea label={t.flow.business.special} rows={3} value={s.business.specialRequests} onChange={setB("specialRequests")} error={errors.specialRequests} maxLength={1000} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Step>
              )}

              {s.step === 4 && (
                <Step title={t.flow.contact.title} lead={t.flow.contact.lead} headingRef={heading}>
                  <div className="grid max-w-xl gap-5">
                    <TextField label={t.flow.contact.fullName} required value={s.contact.fullName} onChange={setC("fullName")} error={errors.fullName} autoComplete="name" />
                    <TextField label={t.flow.contact.whatsapp} required hint={t.flow.contact.whatsappHint} value={s.contact.whatsapp} onChange={setC("whatsapp")} error={errors.whatsapp} type="tel" inputMode="tel" autoComplete="tel" placeholder="+228 …" />
                    <TextField label={t.flow.contact.email} required value={s.contact.email} onChange={setC("email")} error={errors.email} type="email" inputMode="email" autoComplete="email" />
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
                      <Item k={`${t.flow.business.city}, ${t.flow.business.country}`} v={`${s.business.city}, ${s.business.country}`} />
                      {[s.business.tiktok, s.business.instagram, s.business.facebook, s.business.website].some(Boolean) && (
                        <Item k={t.flow.business.socials} v={[s.business.tiktok, s.business.instagram, s.business.facebook, s.business.website].filter(Boolean).join(" · ")} wide />
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
                      <Item k={t.flow.contact.whatsapp} v={s.contact.whatsapp} />
                      <Item k={t.flow.contact.email} v={s.contact.email} />
                    </ReviewBlock>
                    <p className="text-sm text-dust">{t.flow.review.notice}</p>
                    {submit.status === "error" && <p role="alert" className="rounded-2xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-ivory">{submit.message}</p>}
                  </div>
                </Step>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* the selection, always visible on desktop */}
        <aside className="hidden lg:block">
          <div className="card sticky top-28 p-6">
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

      {/* action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/90 backdrop-blur-md">
        {pkg && (
          <p className="mx-auto max-w-6xl truncate px-4 pt-2 text-xs text-dust sm:px-8 lg:hidden">
            {s.liveType ? `${s.liveType === "online" ? t.liveType.onlineShort : t.liveType.onsiteShort} · ` : ""}{pkg.name[locale]} · {formatDuration(pkg.durationMinutes, locale)} · {priceLabel(pkg)}{s.day && s.time ? ` · ${s.day.slice(8)}/${s.day.slice(5, 7)} ${s.time}` : ""}
          </p>
        )}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
          {s.step > 0 ? (
            <button type="button" onClick={() => go(s.step - 1)} className="btn btn-ghost"><ArrowLeft className="size-4" /> {t.flow.back}</button>
          ) : (
            <Link href="/" className="btn btn-ghost"><ArrowLeft className="size-4" /> {t.flow.home}</Link>
          )}
          {s.step < LAST ? (
            <button type="button" onClick={next} disabled={!canNext} className="btn btn-primary min-w-40">{t.flow.next} <ArrowRight className="size-4" /></button>
          ) : (
            <button type="button" onClick={send} disabled={submit.status === "sending"} className="btn btn-primary whitespace-nowrap sm:min-w-48">
              {submit.status === "sending" ? <><LoaderCircle className="size-4 animate-spin" /> {t.flow.review.sending}</> : <>{t.flow.review.submit} <ArrowRight className="size-4" /></>}
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <Link href="/" className="text-ivory" aria-label="OCD Live"><Logo className="h-8 w-auto" /></Link>
          <div className="flex items-center gap-2">
            <LangToggle />
            <Link href="/" aria-label={t.flow.home} className="grid size-10 place-items-center rounded-full border border-line-2 text-sand hover:text-ivory"><X className="size-4" /></Link>
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
    <span className="absolute right-4 top-4 grid size-7 place-items-center rounded-full bg-ember text-ink">
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
        <motion.circle cx="48" cy="48" r="44" fill="none" stroke="#d2692a" strokeWidth="4" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.83, 0, 0.17, 1] }} />
        <motion.path d="M30 49 l12 12 l24 -26" fill="none" stroke="#f3ebdd" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
    </div>
  );
}
