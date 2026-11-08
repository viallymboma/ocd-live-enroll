import type { Metadata } from "next";

import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh bg-ink lg:grid lg:grid-cols-[240px_1fr]">
      <AdminNav name={admin.name} />
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
