import { redirect } from "next/navigation";

import { LoginForm } from "@/components/admin/AuthForms";
import { Logo } from "@/components/site/Logo";
import { getDict } from "@/i18n/server";
import { adminCount, currentAdmin } from "@/server/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");
  if ((await adminCount()) === 0) redirect("/setup");
  const { t } = await getDict();
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto h-12 w-auto text-ivory" />
        <h1 className="display mt-8 text-center text-4xl">{t.admin.login.title}</h1>
        <LoginForm />
      </div>
    </main>
  );
}
