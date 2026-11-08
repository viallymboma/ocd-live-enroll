"use client";

import { ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useState } from "react";

import { packageAction } from "@/app/admin/actions";
import { FieldLabel } from "@/components/flow/fields";
import { SideDrawer } from "@/components/ui/SideDrawer";
import { useI18n } from "@/i18n/client";
import { currencyLabel, formatDuration } from "@/lib/time";
import type { PackageDTO } from "@/lib/types";

/**
 * Packages admin: a list of rows; clicking one (or "Add a package") opens its form in a
 * DRAWER from the right (full screen on phones) with a sticky Save bar. Saving closes it.
 */
export function PackagesAdmin({ packages, nextOrder, currency }: { packages: PackageDTO[]; nextOrder: number; currency: string }) {
  const { locale, t } = useI18n();
  const p = t.admin.packages;
  const [editing, setEditing] = useState<PackageDTO | "new" | null>(null);

  return (
    <>
      <div className="mt-8 grid gap-2">
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => setEditing(pkg)}
            className="card group flex w-full items-center gap-4 p-4 text-left transition hover:border-line-2 sm:p-5"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-ember/12 text-xs font-extrabold text-ember-2">{formatDuration(pkg.durationMinutes, locale)}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="display truncate text-2xl">{pkg.name[locale]}</span>
                {pkg.placeholder && <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold">{t.packages.tbcBadge}</span>}
                {!pkg.active && <span className="rounded-full bg-dust/15 px-2.5 py-0.5 text-[11px] font-semibold text-dust">{p.inactive}</span>}
              </span>
              <span className="mt-0.5 block truncate text-sm text-sand">
                {pkg.price > 0 ? `${pkg.price.toLocaleString(locale)} ${currencyLabel(currency)}` : t.packages.priceTbc}
                {" · "}
                {pkg.liveTypes.map((lt) => (lt === "online" ? t.liveType.onlineShort : t.liveType.onsiteShort)).join(" & ")}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-dust transition group-hover:translate-x-0.5 group-hover:text-ivory" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex min-h-16 items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-line-2 text-sm font-bold text-sand transition hover:border-ember hover:text-ember"
        >
          <Plus className="size-4" strokeWidth={2.6} /> {p.add}
        </button>
      </div>

      <PackageDrawer
        key={editing === "new" ? "new" : editing?.id ?? "none"}
        pkg={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        nextOrder={nextOrder}
        currency={currency}
      />
    </>
  );
}

function PackageDrawer({ pkg, open, onClose, nextOrder, currency }: { pkg: PackageDTO | null; open: boolean; onClose: () => void; nextOrder: number; currency: string }) {
  const { locale, t } = useI18n();
  const p = t.admin.packages;
  const router = useRouter();
  const formId = useId();
  const [state, action, pending] = useActionState(packageAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to a finished save only
  }, [state]);

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      side="right"
      title={pkg ? pkg.name[locale] : p.add}
      closeLabel={t.ui.close}
      panelClassName="w-full sm:w-[min(640px,92vw)]"
      footer={
        <div className="flex items-center gap-3">
          {state?.error && <span className="error mr-auto" role="alert">{p.invalid}</span>}
          <button type="button" onClick={onClose} className="btn btn-ghost ml-auto">{t.ui.cancel}</button>
          <button type="submit" form={formId} disabled={pending} className="btn btn-primary">{p.save}</button>
        </div>
      }
    >
      <form id={formId} action={action} className="grid gap-7 p-5 sm:p-6">
        <input type="hidden" name="id" value={pkg?.id ?? "new"} />

        <section className="grid gap-4">
          <p className="kicker">{p.essentials}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Num label={`${p.duration}`} required name="duration" min={15} max={720} step={15} defaultValue={pkg?.durationMinutes ?? 90} />
            <Num label={`${p.price} (${currencyLabel(currency)})`} name="price" min={0} step={500} defaultValue={pkg?.price ?? 0} />
            <Num label={p.order} name="order" min={0} defaultValue={pkg?.order ?? nextOrder} />
          </div>
          <div className="field">
            <FieldLabel label={p.types} required />
            <div className="flex flex-wrap gap-2">
              <Chip name="type_online" label={t.liveType.online} defaultChecked={pkg ? pkg.liveTypes.includes("online") : true} />
              <Chip name="type_onsite" label={`${t.liveType.onsite} — ${t.liveType.onsiteCity}`} defaultChecked={pkg ? pkg.liveTypes.includes("onsite") : true} />
            </div>
          </div>
          <div className="grid gap-2 rounded-2xl border border-line p-1">
            <Switch name="active" label={p.active} hint={p.activeHint} defaultChecked={pkg?.active ?? true} />
            <Switch name="placeholder" label={p.placeholder} hint={p.placeholderHint} defaultChecked={pkg?.placeholder ?? false} />
          </div>
        </section>

        {(["fr", "en"] as const).map((l) => (
          <section key={l} className="grid gap-4 border-t border-line pt-6">
            <p className="kicker">{p[l]}</p>
            <Text label={p.name} name={`name_${l}`} required={l === "fr"} defaultValue={pkg?.name[l]} maxLength={80} />
            <Area label={p.description} name={`desc_${l}`} defaultValue={pkg?.description[l]} rows={3} maxLength={600} />
            <Area label={p.deliverables} name={`deliv_${l}`} defaultValue={pkg?.deliverables[l].join("\n")} rows={5} />
          </section>
        ))}
      </form>
    </SideDrawer>
  );
}

function Num({ label, name, required, ...rest }: { label: string; name: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <input id={id} name={name} type="number" inputMode="numeric" required={required} className="input tabular-nums" {...rest} />
    </div>
  );
}
function Text({ label, name, required, ...rest }: { label: string; name: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <input id={id} name={name} required={required} className="input" {...rest} />
    </div>
  );
}
function Area({ label, name, ...rest }: { label: string; name: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={label} />
      <textarea id={id} name={name} className="input resize-y" {...rest} />
    </div>
  );
}

/** On/off as a real switch (a checkbox underneath, so plain forms post it). */
export function Switch({ name, label, hint, defaultChecked, checked, onChange }: { name?: string; label: string; hint?: string; defaultChecked?: boolean; checked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-xl px-3 py-2.5 hover:bg-ink-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ivory">{label}</span>
        {hint && <span className="block text-xs text-dust">{hint}</span>}
      </span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} checked={checked} onChange={onChange ? (e) => onChange(e.target.checked) : undefined} className="peer sr-only" />
      <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full bg-line-2 transition peer-checked:bg-ember peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold after:absolute after:left-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

/** A toggle chip (a checkbox underneath). */
function Chip({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="inline-flex min-h-11 items-center rounded-full border border-line-2 px-4 text-sm font-semibold text-sand transition peer-checked:border-ember peer-checked:bg-ember/12 peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-gold">
        {label}
      </span>
    </label>
  );
}
