import { PackageEditor } from "@/components/admin/PackageEditor";
import { getDict } from "@/i18n/server";
import { getRules, listPackages } from "@/server/settings";

export default async function PackagesPage() {
  const { t } = await getDict();
  const [packages, rules] = await Promise.all([listPackages(), getRules()]);
  const nextOrder = Math.max(0, ...packages.map((p) => p.order)) + 1;
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="display text-4xl sm:text-5xl">{t.admin.packages.title}</h1>
      <p className="mt-3 max-w-2xl text-sm text-sand">{t.admin.packages.lead}</p>
      <div className="mt-8 grid gap-3">
        {packages.map((p) => <PackageEditor key={p.id} pkg={p} nextOrder={nextOrder} currency={rules.currency} />)}
        <PackageEditor key={`new-${packages.length}`} pkg={null} nextOrder={nextOrder} currency={rules.currency} />
      </div>
    </div>
  );
}
