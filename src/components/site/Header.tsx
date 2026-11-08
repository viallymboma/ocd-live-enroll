import Link from "next/link";

import type { Dict } from "@/i18n";
import { Preferences } from "./Preferences";
import { Logo } from "./Logo";

export function Header({ t }: { t: Dict }) {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
        <Link href="/" className="text-ivory" aria-label="OCD Live">
          <Logo className="h-9 w-auto sm:h-11" />
        </Link>
        <nav className="flex items-center gap-2 sm:gap-6">
          <a href="#how" className="hidden text-sm font-semibold text-sand transition hover:text-ivory md:inline">{t.nav.how}</a>
          <a href="#packages" className="hidden text-sm font-semibold text-sand transition hover:text-ivory md:inline">{t.nav.packages}</a>
          <Preferences />
          <Link href="/reserver" className="btn btn-primary hidden h-10 min-h-10 px-4 text-sm sm:inline-flex">{t.nav.start}</Link>
        </nav>
      </div>
    </header>
  );
}
