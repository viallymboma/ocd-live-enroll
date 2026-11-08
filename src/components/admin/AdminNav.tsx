"use client";

import { CalendarDays, ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, Package, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { logoutAction } from "@/app/admin/actions";
import { LangToggle } from "@/components/site/LangToggle";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { SideDrawer } from "@/components/ui/SideDrawer";
import { useI18n } from "@/i18n/client";

/**
 * Admin navigation.
 * Desktop (≥1024 px): a fixed sidebar on the left.
 * Phones/tablets: a top bar with a burger; the SAME sidebar slides in from the left as a drawer
 * (backdrop, swipe-free close by tap/Escape, focus kept inside, closes on navigation).
 */
export function AdminNav({ name }: { name: string }) {
  const { t } = useI18n();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = [
    { href: "/admin", label: t.admin.nav.overview, Icon: LayoutDashboard, exact: true },
    { href: "/admin/demandes", label: t.admin.nav.requests, Icon: Inbox },
    { href: "/admin/formules", label: t.admin.nav.packages, Icon: Package },
    { href: "/admin/planning", label: t.admin.nav.schedule, Icon: CalendarDays },
    { href: "/admin/compte", label: t.admin.nav.account, Icon: UserRound },
  ];
  const current = items.find(({ href, exact }) => (exact ? path === href : path.startsWith(href)));

  // Close the drawer when the page changes.
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }

  const body = (onNavigate?: () => void) => (
    <>
      <nav className="mt-2 grid gap-1 px-3">
        {items.map(({ href, label, Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition lg:min-h-11 lg:text-sm ${active ? "bg-ember/15 text-ember-2" : "text-sand hover:bg-ink-3 hover:text-ivory"}`}
            >
              <Icon className="size-[18px] lg:size-4" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-line p-4">
        <p className="truncate text-sm font-semibold text-ivory">{name}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Link href="/" target="_blank" className="grid size-10 place-items-center rounded-full border border-line-2 text-sand hover:text-ivory" aria-label={t.admin.nav.site}><ExternalLink className="size-4" /></Link>
          <form action={logoutAction}><button className="inline-flex h-10 items-center gap-2 rounded-full border border-line-2 px-3 text-xs font-semibold text-sand hover:text-ivory"><LogOut className="size-4" /> {t.admin.nav.logout}</button></form>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-ink-2/95 backdrop-blur lg:flex">
        <Link href="/admin" className="flex items-center gap-3 px-5 py-6 text-ivory">
          <Logo className="h-8 w-auto" />
          <span className="kicker">{t.admin.brand}</span>
        </Link>
        {body()}
      </aside>

      {/* phone/tablet top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-ink-2/95 px-3 py-2.5 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.admin.nav.menu}
          aria-expanded={open}
          aria-controls="admin-drawer"
          className="grid size-11 place-items-center rounded-full border border-line-2 text-ivory hover:border-sand"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/admin" className="text-ivory" aria-label={t.admin.brand}><Logo className="h-7 w-auto" /></Link>
        {current && <span className="ml-auto truncate text-sm font-semibold text-sand">{current.label}</span>}
      </header>

      <SideDrawer open={open} onClose={() => setOpen(false)} side="left" closeLabel={t.ui.close} className="lg:hidden" panelClassName="w-[min(84vw,320px)] pb-[env(safe-area-inset-bottom)]">
        <div id="admin-drawer" className="flex min-h-full flex-col">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 text-ivory">
            <Logo className="h-8 w-auto" />
            <span className="kicker">{t.admin.brand}</span>
          </Link>
          <button type="button" onClick={() => setOpen(false)} aria-label={t.ui.close} className="grid size-10 place-items-center rounded-full border border-line-2 text-sand hover:text-ivory">
            <X className="size-4" />
          </button>
        </div>
        {body(() => setOpen(false))}
        </div>
      </SideDrawer>
    </>
  );
}
