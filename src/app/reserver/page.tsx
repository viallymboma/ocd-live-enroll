import type { Metadata } from "next";

import { BookingFlow } from "@/components/flow/BookingFlow";
import { getDict } from "@/i18n/server";
import type { LiveType } from "@/lib/types";
import { getRules, listPackages } from "@/server/settings";
import { storageEnabled } from "@/server/storage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.nav.start };
}

export default async function ReserverPage({ searchParams }: { searchParams: Promise<{ type?: string; package?: string; step?: string }> }) {
  const sp = await searchParams;
  const [packages, rules] = await Promise.all([listPackages({ activeOnly: true }), getRules()]);
  const type: LiveType | null = sp.type === "online" || sp.type === "onsite" ? sp.type : null;
  return (
    <BookingFlow
      packages={packages}
      currency={rules.currency}
      uploadsEnabled={storageEnabled()}
      initialType={type}
      initialStep={sp.step ?? null}
      initialPackage={sp.package && /^[a-f0-9]{24}$/.test(sp.package) ? sp.package : null}
    />
  );
}
