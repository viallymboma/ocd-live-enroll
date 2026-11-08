import Link from "next/link";

import type { Dict } from "@/i18n";
import { HeaderShell } from "./HeaderShell";
import { Logo } from "./Logo";
import { Preferences } from "./Preferences";

export function Header({ t }: { t: Dict }) {
  return (
    <HeaderShell>
      <Link href="/" className="text-ivory" aria-label="OCD Live">
        <Logo className="h-9 w-auto transition-[height] duration-500 sm:h-11 [[data-floating]_&]:h-8 sm:[[data-floating]_&]:h-9" />
      </Link>
      <nav className="flex items-center gap-2 sm:gap-6">
        <a href="#how" className="hidden text-sm font-semibold text-sand transition hover:text-ivory md:inline">{t.nav.how}</a>
        <a href="#packages" className="hidden text-sm font-semibold text-sand transition hover:text-ivory md:inline">{t.nav.packages}</a>
        <Preferences />
        <Link href="/reserver" className="btn btn-primary hidden h-10 min-h-10 px-4 text-sm sm:inline-flex">{t.nav.start}</Link>
      </nav>
    </HeaderShell>
  );
}
