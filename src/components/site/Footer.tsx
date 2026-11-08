import Link from "next/link";

import type { Dict } from "@/i18n";
import { Logo } from "./Logo";

export function Footer({ t }: { t: Dict }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-10 text-sm text-dust sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Logo className="h-8 w-auto text-ivory" />
        <span>© {new Date().getFullYear()} {t.footer.rights}</span>
        <Link href="/admin" className="hover:text-sand">{t.footer.admin}</Link>
      </div>
    </footer>
  );
}
