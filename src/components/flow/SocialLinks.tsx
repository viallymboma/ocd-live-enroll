"use client";

import { ChevronRight, Globe, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { useI18n } from "@/i18n/client";
import { NETWORKS, socialLabel, type Network, type SocialLink } from "@/lib/social";
import { socialSchema } from "@/lib/validation";
import { FieldLabel, useErrorText } from "./fields";

const BADGE: Record<Network, { bg: string; fg: string; mark: string }> = {
  tiktok: { bg: "#111111", fg: "#ffffff", mark: "Tk" },
  instagram: { bg: "linear-gradient(135deg,#feda75,#d62976 45%,#4f5bd5)", fg: "#ffffff", mark: "Ig" },
  facebook: { bg: "#1877f2", fg: "#ffffff", mark: "f" },
  youtube: { bg: "#ff0033", fg: "#ffffff", mark: "▶" },
  x: { bg: "#111111", fg: "#ffffff", mark: "𝕏" },
  snapchat: { bg: "#fffc00", fg: "#111111", mark: "Sc" },
  linkedin: { bg: "#0a66c2", fg: "#ffffff", mark: "in" },
  website: { bg: "var(--ember)", fg: "var(--on-ember)", mark: "" },
};

export function NetworkBadge({ network, size = 36 }: { network: Network; size?: number }) {
  const b = BADGE[network];
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-xl text-[13px] font-extrabold" style={{ background: b.bg, color: b.fg, width: size, height: size }}>
      {network === "website" ? <Globe className="size-4" /> : b.mark}
    </span>
  );
}

/**
 * Social networks as a LIST in the form (like habesha's brand-lead sheets):
 * "Add a social network" opens a bottom sheet with the form; once saved the
 * network appears in the list; tapping it reopens the same sheet to edit or delete.
 */
export function SocialLinks({ value, onChange, errors }: { value: SocialLink[]; onChange: (v: SocialLink[]) => void; errors: Record<number, string> }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const full = value.length >= 8;

  return (
    <div className="grid gap-3">
      <div>
        <FieldLabel label={t.social.title} />
        <p className="hint mt-0.5">{t.social.lead}</p>
      </div>

      <ul className="grid gap-2">
        <AnimatePresence initial={false}>
          {value.map((s, i) => (
            <motion.li key={`${s.network}-${i}`} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              <button
                type="button"
                onClick={() => setEditing(i)}
                aria-invalid={errors[i] ? true : undefined}
                className={`group flex w-full items-center gap-3 rounded-2xl border bg-ink-2 p-3 text-left transition hover:border-line-2 ${errors[i] ? "border-bad" : "border-line"}`}
              >
                <NetworkBadge network={s.network} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ivory">{t.social.names[s.network]}</span>
                  <span className={`block truncate text-sm ${errors[i] ? "text-bad" : "text-dust"}`}>{errors[i] ? t.social.invalid : socialLabel(s.url)}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-dust transition group-hover:translate-x-0.5" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <button
        type="button"
        disabled={full}
        onClick={() => setEditing("new")}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-2 text-sm font-bold text-sand transition hover:border-ember hover:text-ember disabled:opacity-50"
      >
        <Plus className="size-4" strokeWidth={2.6} /> {full ? t.social.max : t.social.add}
      </button>

      {editing !== null && (
        <SocialSheet
          key={String(editing)}
          initial={editing === "new" ? null : value[editing]}
          taken={value.filter((_, i) => i !== editing).map((s) => s.network)}
          onClose={() => setEditing(null)}
          onSave={(link) => {
            onChange(editing === "new" ? [...value, link] : value.map((x, i) => (i === editing ? link : x)));
            setEditing(null);
          }}
          onDelete={editing === "new" ? undefined : () => {
            onChange(value.filter((_, i) => i !== editing));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SocialSheet({ initial, taken, onClose, onSave, onDelete }: {
  initial: SocialLink | null;
  taken: Network[];
  onClose: () => void;
  onSave: (l: SocialLink) => void;
  onDelete?: () => void;
}) {
  const { t } = useI18n();
  const id = useId();
  const [network, setNetwork] = useState<Network | null>(initial?.network ?? null);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [errs, setErrs] = useState<{ network?: string; url?: string }>({});
  const urlMsg = useErrorText(errs.url);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!network) return setErrs({ network: "network" });
    if (taken.includes(network)) return setErrs({ network: "duplicate" });
    const r = socialSchema.safeParse({ network, url });
    if (!r.success) {
      const issue = r.error.issues[0];
      setErrs({ url: issue?.message === "required" ? "required" : "url" });
      document.getElementById(`${id}-url`)?.focus();
      return;
    }
    onSave(r.data as SocialLink);
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={initial ? t.social.editTitle : t.social.addTitle}
      closeLabel={t.ui.close}
      footer={
        <div className="flex items-center gap-3">
          {onDelete && (
            <button type="button" onClick={onDelete} aria-label={t.ui.delete} className="grid size-12 shrink-0 place-items-center rounded-full border border-bad/40 text-bad hover:bg-bad/10">
              <Trash2 className="size-4" />
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-ghost flex-1">{t.ui.cancel}</button>
          <button type="submit" form={`${id}-form`} className="btn btn-primary flex-1">{t.ui.save}</button>
        </div>
      }
    >
      <form id={`${id}-form`} noValidate onSubmit={save} className="grid gap-6">
        <fieldset>
          <legend className="label mb-3">
            {t.social.network}<span className="req" aria-hidden>*</span>
          </legend>
          <div role="radiogroup" className="grid grid-cols-4 gap-2">
            {NETWORKS.map((n) => {
              const on = network === n;
              const used = taken.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={used}
                  onClick={() => { setNetwork(n); setErrs({}); }}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-[11px] font-semibold transition disabled:opacity-35 ${on ? "border-ember bg-ember/10 text-ivory ring-2 ring-ember/25" : "border-line text-sand hover:border-line-2"}`}
                >
                  <NetworkBadge network={n} size={32} />
                  <span className="max-w-full truncate">{t.social.names[n].replace(/ \(.*\)$/, "")}</span>
                </button>
              );
            })}
          </div>
          {errs.network && <p role="alert" className="error mt-2">{errs.network === "duplicate" ? t.social.duplicate : t.flow.errors.network}</p>}
        </fieldset>

        <div className="field">
          <FieldLabel htmlFor={`${id}-url`} label={t.social.link} required />
          <input
            id={`${id}-url`}
            className="input"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setErrs((x) => ({ ...x, url: undefined })); }}
            placeholder={network === "website" ? "www.mamarque.com" : "@mamarque"}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={urlMsg ? true : undefined}
            aria-describedby={`${id}-urlm`}
          />
          <p id={`${id}-urlm`} className={urlMsg ? "error" : "hint"} role={urlMsg ? "alert" : undefined}>{urlMsg ?? t.social.linkHint}</p>
        </div>
      </form>
    </BottomSheet>
  );
}
