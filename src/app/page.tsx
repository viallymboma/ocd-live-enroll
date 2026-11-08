import { LiveTicker } from "@/components/fx/LiveTicker";
import { ScrollProgress } from "@/components/fx/ScrollProgress";
import { FinalCta } from "@/components/site/FinalCta";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { HowItWorks } from "@/components/site/HowItWorks";
import { Packages } from "@/components/site/Packages";
import { getDict } from "@/i18n/server";
import type { PackageDTO } from "@/lib/types";
import { DEFAULT_RULES, getRules, listPackages } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { locale, t } = await getDict();
  // The landing must never fail because the database is slow: the CTAs come first.
  let packages: PackageDTO[] = [];
  let currency = DEFAULT_RULES.currency;
  try {
    [packages, { currency }] = await Promise.all([listPackages({ activeOnly: true }), getRules()]);
  } catch (e) {
    console.error("[home] packages", e);
  }
  return (
    <>
      <ScrollProgress />
      <Header t={t} />
      <main>
        <Hero t={t} />
        <LiveTicker />
        <HowItWorks />
        <Packages t={t} locale={locale} packages={packages} currency={currency} />
        <FinalCta t={t} />
      </main>
      <Footer t={t} />
    </>
  );
}
