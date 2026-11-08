"use client";

import { CheckCircle2 } from "lucide-react";
import { useActionState } from "react";

import { accountAction, passwordAction } from "@/app/admin/actions";
import { FieldLabel } from "@/components/flow/fields";
import { useI18n } from "@/i18n/client";
import { PasswordInput } from "./AuthForms";

export function AccountForm({ name, email }: { name: string; email: string }) {
  const { t } = useI18n();
  const a = t.admin.account;
  const [state, action, pending] = useActionState(accountAction, undefined);
  return (
    <form action={action} className="card grid gap-4 p-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gold">{a.profile}</h2>
      <div className="field"><FieldLabel htmlFor="acc-name" label={a.name} required /><input id="acc-name" name="name" defaultValue={name} required maxLength={80} autoComplete="name" className="input" aria-invalid={state?.error === "name" || undefined} /></div>
      <div className="field">
        <FieldLabel htmlFor="acc-email" label={a.email} required />
        <input id="acc-email" name="email" type="email" defaultValue={email} required autoComplete="username" className="input" aria-invalid={state?.error === "email" || state?.error === "taken" || undefined} />
        <p className="hint">{a.emailHint}</p>
      </div>
      {state?.error && <p role="alert" className="error">{(a.errors as Record<string, string>)[state.error]}</p>}
      {state?.ok && <p role="status" className="flex items-center gap-2 text-sm font-semibold text-ok"><CheckCircle2 className="size-4" /> {a.saved}</p>}
      <button disabled={pending} className="btn btn-primary justify-self-start">{t.ui.save}</button>
    </form>
  );
}

export function PasswordForm() {
  const { t } = useI18n();
  const a = t.admin.account;
  const [state, action, pending] = useActionState(passwordAction, undefined);
  return (
    <form action={action} key={state?.ok ? "done" : "form"} className="card grid gap-4 p-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-gold">{a.password}</h2>
      <div className="field"><FieldLabel htmlFor="current" label={a.current} required /><PasswordInput name="current" autoComplete="current-password" invalid={state?.error === "wrong"} /></div>
      <div className="field"><FieldLabel htmlFor="password" label={t.admin.reset.password} required /><PasswordInput name="password" autoComplete="new-password" minLength={10} invalid={state?.error === "weak"} /><p className="hint">{t.admin.reset.hint}</p></div>
      <div className="field"><FieldLabel htmlFor="confirm" label={t.admin.reset.confirm} required /><PasswordInput name="confirm" autoComplete="new-password" minLength={10} invalid={state?.error === "mismatch"} /></div>
      {state?.error && <p role="alert" className="error">{(a.errors as Record<string, string>)[state.error]}</p>}
      {state?.ok && <p role="status" className="flex items-center gap-2 text-sm font-semibold text-ok"><CheckCircle2 className="size-4" /> {a.changed}</p>}
      <button disabled={pending} className="btn btn-primary justify-self-start">{a.changeButton}</button>
    </form>
  );
}
