"use client";

import { useId } from "react";

import { useI18n } from "@/i18n/client";

type Common = { label: string; error?: string; hint?: string; required?: boolean };

function useErr(error?: string) {
  const { t } = useI18n();
  if (!error) return undefined;
  return (t.flow.errors as Record<string, unknown>)[error] as string | undefined ?? error;
}

export function TextField({ label, error, hint, required, value, onChange, ...rest }: Common & { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
  const msg = useErr(error);
  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-ember" aria-hidden>*</span>}
      </label>
      <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={msg ? true : undefined} aria-describedby={msg || hint ? `${id}-m` : undefined} required={required} {...rest} />
      {(msg || hint) && <p id={`${id}-m`} className={msg ? "error" : "hint"}>{msg ?? hint}</p>}
    </div>
  );
}

export function TextArea({ label, error, hint, required, value, onChange, rows = 4, maxLength }: Common & { value: string; onChange: (v: string) => void; rows?: number; maxLength?: number }) {
  const id = useId();
  const msg = useErr(error);
  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-ember" aria-hidden>*</span>}
      </label>
      <textarea id={id} rows={rows} maxLength={maxLength} className="input resize-y" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={msg ? true : undefined} aria-describedby={`${id}-m`} required={required} />
      <p id={`${id}-m`} className={msg ? "error" : "hint flex justify-between"}>
        {msg ?? (
          <>
            <span>{hint}</span>
            {maxLength && <span>{value.length}/{maxLength}</span>}
          </>
        )}
      </p>
    </div>
  );
}

export function SelectField({ label, error, required, value, onChange, options, placeholder }: Common & { value: string; onChange: (v: string) => void; options: [string, string][]; placeholder: string }) {
  const id = useId();
  const msg = useErr(error);
  return (
    <div className="field">
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-ember" aria-hidden>*</span>}
      </label>
      <select id={id} className="input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%23cfc4b4%22 fill=%22none%22 stroke-width=%221.6%22/></svg>')] bg-[position:right_1rem_center] bg-no-repeat pr-10" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={msg ? true : undefined} required={required}>
        <option value="">{placeholder}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {msg && <p className="error">{msg}</p>}
    </div>
  );
}
