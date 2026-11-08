import Link from "next/link";

import { Logo } from "@/components/site/Logo";
import { getDict } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getDict();
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <Logo className="mx-auto h-14 w-auto text-ivory" />
        <p className="display mt-10 text-[clamp(4rem,14vw,9rem)] font-light text-ember">404</p>
        <h1 className="display text-3xl">{t.notFound.title}</h1>
        <p className="mt-3 text-sand">{t.notFound.lead}</p>
        <Link href="/" className="btn btn-primary mt-8">{t.notFound.home}</Link>
      </div>
    </main>
  );
}
