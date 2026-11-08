"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * THE overlay primitive (ported from habesha-project/front AppBottomSheet).
 * Phone: a sheet from the bottom, where the thumb is. Wide screen: a centred dialog.
 * Portal to <body>, focus moved in and restored, Escape closes, page scroll
 * locked, everything else made `inert` so screen readers stay inside.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: ReactNode;
  /** Sticky actions at the bottom of the sheet (Save / Delete…). */
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const reduce = useReducedMotion();
  // Read through an effect event: callers pass onClose inline (see habesha's note — a dependency here
  // re-ran the effect on every keystroke and stole focus from the search box).
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => panelRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings = Array.from(document.body.children).filter((n) => !n.hasAttribute("data-sheet-root")) as HTMLElement[];
    const wasInert = siblings.map((n) => n.hasAttribute("inert"));
    siblings.forEach((n) => n.setAttribute("inert", ""));
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const f = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!f || f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      siblings.forEach((n, i) => {
        if (!wasInert[i]) n.removeAttribute("inert");
      });
      restoreFocusTo.current?.focus?.();
    };
  }, [open]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div data-sheet-root className="fixed inset-0 z-[100] flex flex-col justify-end md:items-center md:justify-center md:p-6">
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
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            drag={reduce ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className={`relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] border border-line bg-ink-2 text-ivory shadow-[var(--shadow)] outline-none md:max-h-[85dvh] md:rounded-[28px] ${size === "lg" ? "md:max-w-2xl" : "md:max-w-lg"}`}
          >
            <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-11 shrink-0 rounded-full bg-line-2 md:hidden" />
            <div className="flex shrink-0 items-start justify-between gap-4 px-5 pt-4 sm:px-6 md:pt-6">
              <h2 id={titleId} className="display text-[1.7rem] leading-tight">{title}</h2>
              <button type="button" onClick={onClose} aria-label={closeLabel} className="-mr-1 grid size-10 shrink-0 place-items-center rounded-full border border-line-2 text-sand hover:text-ivory">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 sm:px-6" onPointerDownCapture={(e) => e.stopPropagation()}>
              {children}
            </div>
            {footer && <div className="shrink-0 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">{footer}</div>}
            {!footer && <div className="h-[env(safe-area-inset-bottom)] shrink-0" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
