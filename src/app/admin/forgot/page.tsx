import { ForgotForm } from "@/components/admin/AuthForms";
import { Logo } from "@/components/site/Logo";
import { Preferences } from "@/components/site/Preferences";
import { getDict } from "@/i18n/server";
import { mailEnabled } from "@/server/mail";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getDict();
  return { title: t.admin.forgot.title, robots: { index: false } };
}

export default async function ForgotPage() {
  const { t } = await getDict();
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <Preferences className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <Logo className="mx-auto h-12 w-auto text-ivory" />
        <h1 className="display mt-8 text-center text-4xl">{t.admin.forgot.title}</h1>
        <p className="mt-3 text-center text-sm text-sand">{t.admin.forgot.lead}</p>
        <ForgotForm mailReady={mailEnabled()} />
      </div>
    </main>
  );
}
