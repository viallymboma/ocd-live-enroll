"use client";

import { useActionState } from "react";

import { loginAction, setupAction } from "@/app/admin/actions";
import { useI18n } from "@/i18n/client";

export function LoginForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="card mt-8 grid gap-4 p-6">
      <label className="field"><span className="label">{t.admin.login.email}</span><input name="email" type="email" required autoComplete="username" className="input" /></label>
      <label className="field"><span className="label">{t.admin.login.password}</span><input name="password" type="password" required autoComplete="current-password" className="input" /></label>
      {state?.error && <p role="alert" className="error">{state.error === "locked" ? t.admin.login.locked : t.admin.login.invalid}</p>}
      <button disabled={pending} className="btn btn-primary mt-2">{t.admin.login.submit}</button>
    </form>
  );
}

export function SetupForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState(setupAction, undefined);
  const msg = state?.error ? (t.admin.setup as Record<string, string>)[state.error] : null;
  return (
    <form action={action} className="card mt-8 grid gap-4 p-6">
      <label className="field"><span className="label">{t.admin.setup.token}</span><input name="token" required autoComplete="off" className="input" /></label>
      <label className="field"><span className="label">{t.admin.setup.name}</span><input name="name" required autoComplete="name" className="input" /></label>
      <label className="field"><span className="label">{t.admin.login.email}</span><input name="email" type="email" required autoComplete="username" className="input" /></label>
      <label className="field"><span className="label">{t.admin.login.password}</span><input name="password" type="password" minLength={10} required autoComplete="new-password" className="input" /></label>
      {msg && <p role="alert" className="error">{msg}</p>}
      <button disabled={pending} className="btn btn-primary mt-2">{t.admin.setup.submit}</button>
    </form>
  );
}
