"use client";

import { useActionState } from "react";

import { packageAction } from "@/app/admin/actions";
import { useI18n } from "@/i18n/client";
import { currencyLabel, formatDuration } from "@/lib/time";
import type { PackageDTO } from "@/lib/types";

export function PackageEditor({ pkg, nextOrder, currency }: { pkg: PackageDTO | null; nextOrder: number; currency: string }) {
  const { locale, t } = useI18n();
  const p = t.admin.packages;
  const [state, action, pending] = useActionState(packageAction, undefined);
  const id = pkg?.id ?? "new";
  return (
    <details className="card group overflow-hidden" open={!pkg}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
        <span className="flex flex-wrap items-center gap-3">
          <span className="display text-2xl">{pkg ? pkg.name[locale] : `+ ${p.add}`}</span>
          {pkg && <span className="rounded-full bg-ember/15 px-2.5 py-0.5 text-xs font-bold text-ember-2">{formatDuration(pkg.durationMinutes, locale)}</span>}
          {pkg && <span className="text-sm text-sand">{pkg.price > 0 ? `${pkg.price.toLocaleString(locale)} ${currencyLabel(currency)}` : t.packages.priceTbc}</span>}
          {pkg?.placeholder && <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold">{t.packages.tbcBadge}</span>}
          {pkg && !pkg.active && <span className="rounded-full bg-dust/15 px-2.5 py-0.5 text-[11px] font-semibold text-dust">{p.inactive}</span>}
        </span>
        <span className="text-dust transition group-open:rotate-45">+</span>
      </summary>
      <form action={action} className="grid gap-5 border-t border-line p-5 sm:p-6">
        <input type="hidden" name="id" value={id} />
        <div className="grid gap-5 md:grid-cols-2">
          {(["fr", "en"] as const).map((l) => (
            <fieldset key={l} className="grid gap-4">
              <legend className="kicker mb-1">{p[l]}</legend>
              <label className="field"><span className="label">{p.name}{l === "fr" && " *"}</span><input name={`name_${l}`} defaultValue={pkg?.name[l]} required={l === "fr"} maxLength={80} className="input" /></label>
              <label className="field"><span className="label">{p.description}</span><textarea name={`desc_${l}`} defaultValue={pkg?.description[l]} rows={2} maxLength={600} className="input" /></label>
              <label className="field"><span className="label">{p.deliverables}</span><textarea name={`deliv_${l}`} defaultValue={pkg?.deliverables[l].join("\n")} rows={4} className="input" /></label>
            </fieldset>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="field"><span className="label">{p.duration} *</span><input name="duration" type="number" min={15} max={720} step={15} defaultValue={pkg?.durationMinutes ?? 90} required className="input" /></label>
          <label className="field"><span className="label">{p.price} ({currencyLabel(currency)})</span><input name="price" type="number" min={0} step={500} defaultValue={pkg?.price ?? 0} className="input" /></label>
          <label className="field"><span className="label">{p.order}</span><input name="order" type="number" min={0} defaultValue={pkg?.order ?? nextOrder} className="input" /></label>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <span className="label w-full">{p.types} *</span>
          <label className="flex items-center gap-2"><input type="checkbox" name="type_online" defaultChecked={pkg ? pkg.liveTypes.includes("online") : true} className="size-4 accent-[#d2692a]" /> {t.liveType.online}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="type_onsite" defaultChecked={pkg ? pkg.liveTypes.includes("onsite") : true} className="size-4 accent-[#d2692a]" /> {t.liveType.onsite}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={pkg?.active ?? true} className="size-4 accent-[#d2692a]" /> {p.active}</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="placeholder" defaultChecked={pkg?.placeholder ?? false} className="size-4 accent-[#d2692a]" /> {p.placeholder}</label>
        </div>
        <div className="flex items-center justify-end gap-3">
          {state?.ok && <span className="text-sm text-ok" role="status">{p.saved}</span>}
          {state?.error && <span className="error" role="alert">{p.invalid}</span>}
          <button disabled={pending} className="btn btn-primary">{p.save}</button>
        </div>
      </form>
    </details>
  );
}
