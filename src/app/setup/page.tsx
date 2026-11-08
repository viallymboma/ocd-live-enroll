import { redirect } from "next/navigation";

import { SetupForm } from "@/components/admin/AuthForms";
import { Logo } from "@/components/site/Logo";
import { getDict } from "@/i18n/server";
import { adminCount } from "@/server/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getDict();
  return { title: t.admin.setup.title, robots: { index: false } };
}

/** One-time screen: gone as soon as an admin exists. Needs SETUP_TOKEN. */
export default async function SetupPage() {
  if ((await adminCount()) > 0) redirect("/admin/login");
  const { t } = await getDict();
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto h-12 w-auto text-ivory" />
        <h1 className="display mt-8 text-center text-4xl">{t.admin.setup.title}</h1>
        <p className="mt-3 text-center text-sm text-sand">{t.admin.setup.lead}</p>
        <SetupForm />
      </div>
    </main>
  );
}
