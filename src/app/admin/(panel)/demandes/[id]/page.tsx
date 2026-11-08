import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MoveBooking, NoteForm, StatusActions } from "@/components/admin/RequestActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getDict } from "@/i18n/server";
import { formatDay, formatDuration, formatMoney, lomeTime } from "@/lib/time";
import { getRequest } from "@/server/queries";
import { signedImageUrl, storageEnabled } from "@/server/storage";

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await getRequest(id);
  if (!b) notFound();
  const { locale, t } = await getDict();
  const d = t.admin.detail;
  const images = storageEnabled() ? [b.uploads.logo, ...b.uploads.photos].filter(Boolean).map((k) => ({ key: k!, url: signedImageUrl(k!), logo: k === b.uploads.logo })) : [];
  const wa = b.contact.whatsapp.replace(/\D/g, "");
  const holding = b.status === "pending" || b.status === "validated";
  const when = (x: Date) => new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lome" }).format(x);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/admin/demandes" className="inline-flex items-center gap-2 text-sm font-semibold text-sand hover:text-ivory"><ArrowLeft className="size-4" /> {d.back}</Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-lg font-bold tracking-widest text-ember-2">{b.reference}</p>
          <h1 className="display mt-1 text-4xl sm:text-5xl">{b.business.name}</h1>
          <div className="mt-3"><StatusBadge status={b.status} label={t.status[b.status]} /></div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {holding && <MoveBooking id={id} />}
          <StatusActions id={id} status={b.status} />
        </div>
      </div>
      {b.status === "rejected" && b.rejectionReason && <p className="mt-4 rounded-2xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm"><span className="font-semibold">{d.reasonShown} —</span> {b.rejectionReason}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-6">
          <Block title={d.booking}>
            <Row k={t.flow.review.live} v={b.liveType === "online" ? t.liveType.online : `${t.liveType.onsite} — ${t.liveType.onsiteCity}`} />
            <Row k={t.flow.review.slot} v={`${formatDay(b.day, locale)} · ${lomeTime(b.start)}–${lomeTime(b.end)} (Lomé)`} />
            <Row k={t.flow.steps[1]} v={`${b.package.name[locale]} · ${formatDuration(b.package.durationMinutes, locale)}`} />
            <Row k={t.flow.review.price} v={b.package.price > 0 ? formatMoney(b.package.price, b.package.currency, locale) : t.packages.priceTbc} />
            <Row k={t.packages.included} v={b.package.deliverables[locale].join(" · ")} wide />
            <p className="text-xs text-dust sm:col-span-2">{d.snapshot}</p>
          </Block>
          <Block title={d.business}>
            <Row k={t.flow.business.sector} v={t.sectors[b.business.sector as keyof typeof t.sectors] ?? b.business.sector} />
            <Row k={`${t.flow.business.city}, ${t.flow.business.country}`} v={`${b.business.city}, ${b.business.country}`} />
            <Row k={t.flow.business.product} v={b.business.product} wide />
            <Row k={t.flow.business.description} v={b.business.description} wide />
            {b.business.specialRequests && <Row k={t.flow.business.special} v={b.business.specialRequests} wide />}
            {(["tiktok", "instagram", "facebook", "website"] as const).map((k) =>
              b.business[k] ? (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-dust">{t.flow.business[k]}</dt>
                  <dd className="mt-1 break-all"><a href={b.business[k]} target="_blank" rel="noopener noreferrer nofollow" className="text-ember-2 hover:underline">{b.business[k]}</a></dd>
                </div>
              ) : null,
            )}
          </Block>
          <Block title={d.photos}>
            {images.length === 0 ? (
              <p className="text-sm text-dust sm:col-span-2">{d.noPhotos}</p>
            ) : (
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                {images.map((img) => (
                  <a key={img.key} href={img.url} target="_blank" rel="noopener noreferrer" className="relative block size-28 overflow-hidden rounded-2xl border border-line-2 bg-ink-3 sm:size-36">
                    {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed Cloudinary URL */}
                    <img src={img.url} alt="" className="size-full object-cover" loading="lazy" />
                    {img.logo && <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-bold">{t.flow.business.logo}</span>}
                  </a>
                ))}
              </div>
            )}
          </Block>
        </div>

        <div className="grid content-start gap-6">
          <Block title={d.contact}>
            <Row k={t.flow.contact.fullName} v={b.contact.fullName} wide />
            <Row k={t.flow.contact.whatsapp} v={b.contact.whatsapp} wide />
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-dust">{t.flow.contact.email}</dt>
              <dd className="mt-1"><a href={`mailto:${b.contact.email}`} className="break-all text-ember-2 hover:underline">{b.contact.email}</a></dd>
            </div>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="btn h-11 min-h-11 bg-[#25d366] text-ink sm:col-span-2"><MessageCircle className="size-4" /> {d.whatsappOpen}</a>
          </Block>
          <Block title={d.notes}>
            <div className="grid gap-3 sm:col-span-2">
              {b.notes.map((n, i) => (
                <div key={i} className="rounded-xl bg-ink-3 p-3 text-sm">
                  <p className="whitespace-pre-line text-ivory">{n.text}</p>
                  <p className="mt-1 text-xs text-dust">{n.by} · {when(n.at)}</p>
                </div>
              ))}
              <NoteForm id={id} />
            </div>
          </Block>
          <Block title={d.history}>
            <ol className="grid gap-3 text-sm sm:col-span-2">
              {[...b.history].reverse().map((h, i) => (
                <li key={i} className="border-l-2 border-line-2 pl-3">
                  <p className="font-semibold text-ivory">{(d.actions as Record<string, string>)[h.action] ?? h.action}{h.to && h.action === "moved" ? ` → ${h.to}` : ""}</p>
                  {h.reason && <p className="text-sand">{h.reason}</p>}
                  <p className="text-xs text-dust">{h.by === "client" ? b.contact.fullName : h.by} · {when(h.at)}</p>
                </li>
              ))}
            </ol>
          </Block>
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-gold">{title}</h2>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Row({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-wider text-dust">{k}</dt>
      <dd className="mt-1 whitespace-pre-line break-words text-ivory">{v}</dd>
    </div>
  );
}
