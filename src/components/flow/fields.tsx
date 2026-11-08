"use client";

import { useId } from "react";

import { useI18n } from "@/i18n/client";

type Common = { label: string; error?: string; hint?: string; required?: boolean };

/** Error key ("required", "email"…) → readable sentence. Unknown keys are shown as sent. */
export function useErrorText(error?: string) {
  const { t } = useI18n();
  if (!error) return undefined;
  const v = (t.flow.errors as Record<string, unknown>)[error];
  return typeof v === "string" ? v : error;
}

/** The label every field uses: a RED asterisk on what the server requires. */
export function FieldLabel({ htmlFor, label, required }: { htmlFor?: string; label: string; required?: boolean }) {
  const { t } = useI18n();
  return (
    <label htmlFor={htmlFor} className="label">
      {label}
      {required && (
        <>
          <span className="req" aria-hidden>*</span>
          <span className="sr-only"> ({t.flow.requiredSr})</span>
        </>
      )}
    </label>
  );
}

export function TextField({ label, error, hint, required, value, onChange, ...rest }: Common & { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
  const msg = useErrorText(error);
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={msg ? true : undefined} aria-required={required || undefined} aria-describedby={msg || hint ? `${id}-m` : undefined} {...rest} />
      {(msg || hint) && <p id={`${id}-m`} className={msg ? "error" : "hint"} role={msg ? "alert" : undefined}>{msg ?? hint}</p>}
    </div>
  );
}

export function TextArea({ label, error, hint, required, value, onChange, rows = 4, maxLength, placeholder }: Common & { value: string; onChange: (v: string) => void; rows?: number; maxLength?: number; placeholder?: string }) {
  const id = useId();
  const msg = useErrorText(error);
  return (
    <div className="field">
      <FieldLabel htmlFor={id} label={label} required={required} />
      <textarea id={id} rows={rows} maxLength={maxLength} placeholder={placeholder} className="input resize-y" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={msg ? true : undefined} aria-required={required || undefined} aria-describedby={`${id}-m`} />
      <p id={`${id}-m`} className={msg ? "error" : "hint flex justify-between gap-4"} role={msg ? "alert" : undefined}>
        {msg ?? (
          <>
            <span>{hint}</span>
            {maxLength && <span className="tabular-nums">{value.length}/{maxLength}</span>}
          </>
        )}
      </p>
    </div>
  );
}

// The old native <select> SelectField lived here. Replaced by components/ui/SelectField
// (search + bottom sheet on phones, like habesha-project/front).
