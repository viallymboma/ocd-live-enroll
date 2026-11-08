"use client";

import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { forgotAction, loginAction, resetAction, setupAction } from "@/app/admin/actions";
import { FieldLabel } from "@/components/flow/fields";
import { useI18n } from "@/i18n/client";

/** Password input with a show/hide eye (typing a long password on a phone without seeing it is error-prone). */
export function PasswordInput({ name, autoComplete, minLength, invalid }: { name: string; autoComplete: string; minLength?: number; invalid?: boolean }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input id={name} name={name} type={shown ? "text" : "password"} required minLength={minLength} autoComplete={autoComplete} aria-invalid={invalid || undefined} className="input pr-12" />
      <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? t.admin.login.hide : t.admin.login.show} aria-pressed={shown} className="absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-dust hover:text-ivory">
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="card mt-8 grid gap-4 p-6">
      <div className="field"><FieldLabel htmlFor="email" label={t.admin.login.email} required /><input id="email" name="email" type="email" required autoComplete="username" className="input" /></div>
      <div className="field">
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel htmlFor="password" label={t.admin.login.password} required />
          <Link href="/admin/forgot" className="text-xs font-semibold text-ember hover:underline">{t.admin.login.forgot}</Link>
        </div>
        <PasswordInput name="password" autoComplete="current-password" invalid={Boolean(state?.error)} />
      </div>
      {state?.error && <p role="alert" className="error">{state.error === "locked" ? t.admin.login.locked : t.admin.login.invalid}</p>}
      <button disabled={pending} className="btn btn-primary mt-2">{t.admin.login.submit}</button>
    </form>
  );
}

export function ForgotForm({ mailReady }: { mailReady: boolean }) {
  const { t } = useI18n();
  const f = t.admin.forgot;
  const [state, action, pending] = useActionState(forgotAction, undefined);
  if (state?.ok) {
    return (
      <div className="card mt-8 grid gap-4 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-ok" />
        <p role="status" className="text-sand">{f.sent}</p>
        <Link href="/admin/login" className="btn btn-ghost">{f.back}</Link>
      </div>
    );
  }
  return (
    <form action={action} className="card mt-8 grid gap-4 p-6">
      {!mailReady && <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2.5 text-sm text-ivory">{f.noMail}</p>}
      <div className="field"><FieldLabel htmlFor="email" label={t.admin.login.email} required /><input id="email" name="email" type="email" required autoComplete="username" className="input" aria-invalid={state?.error === "email" || undefined} /></div>
      {state?.error && <p role="alert" className="error">{(f as Record<string, string>)[state.error] ?? f.server}</p>}
      <button disabled={pending} className="btn btn-primary mt-2">{f.submit}</button>
      <Link href="/admin/login" className="text-center text-sm font-semibold text-sand hover:text-ivory">{f.back}</Link>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { t } = useI18n();
  const r = t.admin.reset;
  const [state, action, pending] = useActionState(resetAction, undefined);
  return (
    <form action={action} className="card mt-8 grid gap-4 p-6">
      <input type="hidden" name="token" value={token} />
      <div className="field"><FieldLabel htmlFor="password" label={r.password} required /><PasswordInput name="password" autoComplete="new-password" minLength={10} invalid={state?.error === "weak"} /><p className="hint">{r.hint}</p></div>
      <div className="field"><FieldLabel htmlFor="confirm" label={r.confirm} required /><PasswordInput name="confirm" autoComplete="new-password" minLength={10} invalid={state?.error === "mismatch"} /></div>
      {state?.error && (
        <p role="alert" className="error">
          {(r as Record<string, string>)[state.error] ?? r.expired}
          {state.error === "expired" && <> <Link href="/admin/forgot" className="underline">{r.again}</Link></>}
        </p>
      )}
      <button disabled={pending} className="btn btn-primary mt-2">{r.submit}</button>
    </form>
  );
}

export function SetupForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(setupAction, undefined);
  const msg = state?.error ? (t.admin.setup as Record<string, string>)[state.error] : null;
  return (
    <form action={action} className="card mt-8 grid gap-4 p-6">
      <div className="field"><FieldLabel htmlFor="token" label={t.admin.setup.token} required /><input id="token" name="token" required autoComplete="off" className="input" /></div>
      <div className="field"><FieldLabel htmlFor="name" label={t.admin.setup.name} required /><input id="name" name="name" required autoComplete="name" className="input" /></div>
      <div className="field"><FieldLabel htmlFor="email" label={t.admin.login.email} required /><input id="email" name="email" type="email" required autoComplete="username" className="input" /></div>
      <div className="field"><FieldLabel htmlFor="password" label={t.admin.login.password} required /><PasswordInput name="password" autoComplete="new-password" minLength={10} /></div>
      {msg && <p role="alert" className="error">{msg}</p>}
      <button disabled={pending} className="btn btn-primary mt-2">{t.admin.setup.submit}</button>
    </form>
  );
}
