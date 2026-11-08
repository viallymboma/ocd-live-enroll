import Link from "next/link";

import { ResetForm } from "@/components/admin/AuthForms";
import { Logo } from "@/components/site/Logo";
import { Preferences } from "@/components/site/Preferences";
import { getDict } from "@/i18n/server";
import { resetTokenValid } from "@/server/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getDict();
  return { title: t.admin.reset.title, robots: { index: false } };
}

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const { t } = await getDict();
  const valid = await resetTokenValid(token);
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <Preferences className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <Logo className="mx-auto h-12 w-auto text-ivory" />
        <h1 className="display mt-8 text-center text-4xl">{t.admin.reset.title}</h1>
        {valid ? (
          <>
            <p className="mt-3 text-center text-sm text-sand">{t.admin.reset.lead}</p>
            <ResetForm token={token} />
          </>
        ) : (
          <div className="card mt-8 grid gap-4 p-6 text-center">
            <p role="alert" className="text-sand">{t.admin.reset.expired}</p>
            <Link href="/admin/forgot" className="btn btn-primary">{t.admin.reset.again}</Link>
          </div>
        )}
      </div>
    </main>
  );
}
