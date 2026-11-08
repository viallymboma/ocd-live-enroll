"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useId, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * A panel sliding in from the side over a dimmed page (admin menu from the left, editors from the right).
 * Escape / backdrop / ✕ close it; focus moves in and is kept inside; page scroll is locked.
 * Optional title bar and sticky footer (Save…). Full width on phones when `wide`.
 */
export function SideDrawer({
  open,
  onClose,
  side = "right",
  title,
  closeLabel,
  footer,
  children,
  className = "",
  panelClassName = "",
}: {
  open: boolean;
  onClose: () => void;
  side?: "left" | "right";
  title?: React.ReactNode;
  closeLabel: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** On the wrapper — e.g. "lg:hidden" for a phone-only drawer. */
  className?: string;
  panelClassName?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const titleId = useId();
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("[data-autofocus], a[aria-current='page'], input, textarea, a, button")?.focus());
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !panel.current) return;
      const f = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([type="hidden"]), textarea, select');
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
  }, [open]);

  if (typeof document === "undefined") return null;
  const from = side === "left" ? "-100%" : "100%";
  return createPortal(
    <AnimatePresence>
      {open && (
        <div data-sheet-root className={`fixed inset-0 z-[90] ${className}`}>
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
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={`absolute inset-y-0 flex flex-col border-line bg-ink-2 shadow-[var(--shadow)] ${side === "left" ? "left-0 border-r" : "right-0 border-l"} ${panelClassName}`}
            initial={reduce ? { opacity: 0 } : { x: from }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: from }}
            transition={{ type: "spring", damping: 34, stiffness: 340 }}
          >
            {title && (
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
                <h2 id={titleId} className="display min-w-0 text-[1.7rem] leading-tight">{title}</h2>
                <button type="button" onClick={onClose} aria-label={closeLabel} className="grid size-10 shrink-0 place-items-center rounded-full border border-line-2 text-sand hover:text-ivory">
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
            {footer && <div className="shrink-0 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
