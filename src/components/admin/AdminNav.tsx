"use client";

import { CalendarDays, ExternalLink, Inbox, LayoutDashboard, LogOut, Package } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/app/admin/actions";
import { LangToggle } from "@/components/site/LangToggle";
import { PreferencesSheetButton } from "@/components/site/Preferences";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { Logo } from "@/components/site/Logo";
import { useI18n } from "@/i18n/client";

export function AdminNav({ name }: { name: string }) {
  const { t } = useI18n();
  const path = usePathname();
  const items = [
    { href: "/admin", label: t.admin.nav.overview, Icon: LayoutDashboard, exact: true },
    { href: "/admin/demandes", label: t.admin.nav.requests, Icon: Inbox },
    { href: "/admin/formules", label: t.admin.nav.packages, Icon: Package },
    { href: "/admin/planning", label: t.admin.nav.schedule, Icon: CalendarDays },
  ];
  return (
    <aside className="sticky top-0 z-20 border-b border-line bg-ink-2/95 backdrop-blur lg:h-dvh lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:block lg:px-5 lg:py-6">
        <Link href="/admin" className="flex items-center gap-3 text-ivory">
          <Logo className="h-8 w-auto" />
          <span className="kicker hidden lg:inline">{t.admin.brand}</span>
        </Link>
        <div className="flex items-center gap-2 lg:hidden">
          <PreferencesSheetButton />
          <form action={logoutAction}><button aria-label={t.admin.nav.logout} className="grid size-10 place-items-center rounded-full border border-line-2 text-sand"><LogOut className="size-4" /></button></form>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-4 lg:grid lg:px-3">
        {items.map(({ href, label, Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-ember/15 text-ember-2" : "text-sand hover:bg-ink-3 hover:text-ivory"}`}>
              <Icon className="size-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="absolute inset-x-0 bottom-0 hidden border-t border-line p-4 lg:block">
        <p className="truncate text-sm font-semibold text-ivory">{name}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Link href="/" target="_blank" className="grid size-10 place-items-center rounded-full border border-line-2 text-sand hover:text-ivory" aria-label={t.admin.nav.site}><ExternalLink className="size-4" /></Link>
          <form action={logoutAction}><button className="inline-flex h-10 items-center gap-2 rounded-full border border-line-2 px-3 text-xs font-semibold text-sand hover:text-ivory"><LogOut className="size-4" /> {t.admin.nav.logout}</button></form>
        </div>
      </div>
    </aside>
  );
}
