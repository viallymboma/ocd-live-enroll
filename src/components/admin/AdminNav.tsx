"use client";

import { CalendarDays, ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, Package, UserRound, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { logoutAction } from "@/app/admin/actions";
import { LangToggle } from "@/components/site/LangToggle";
import { Logo } from "@/components/site/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";
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

      <Drawer open={open} onClose={() => setOpen(false)} label={t.admin.brand} closeLabel={t.ui.close}>
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
      </Drawer>
    </>
  );
}

/** A panel sliding in from the left over a dimmed page. Escape / backdrop close it; focus stays inside. */
function Drawer({ open, onClose, label, closeLabel, children }: { open: boolean; onClose: () => void; label: string; closeLabel: string; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("a[aria-current='page'], a, button")?.focus());
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const f = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      back?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <motion.button
            type="button"
            tabIndex={-1}
            aria-label={closeLabel}
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            ref={panel}
            id="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="absolute inset-y-0 left-0 flex w-[min(84vw,320px)] flex-col overflow-y-auto border-r border-line bg-ink-2 pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow)]"
            initial={reduce ? { opacity: 0 } : { x: "-100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "-100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 340 }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
