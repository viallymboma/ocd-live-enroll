"use client";

import { Check, ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useIsMobile } from "@/hooks/useIsMobile";
import { useI18n } from "@/i18n/client";
import { BottomSheet } from "./BottomSheet";

export type SelectOption = { value: string; label: string; hint?: string; leading?: ReactNode; keywords?: string };

/**
 * A select with search (ported from habesha-project/front SelectField).
 * Phone: the list opens in a BOTTOM SHEET (thumb-sized rows, keyboard only if the
 * search is tapped). Wide screen: a portalled, fixed dropdown that flips up when
 * there is no room below. Combobox ARIA, arrows/Enter/Escape, clear button.
 * `name` renders a hidden input so it also works inside plain <form>s.
 */
export const SelectField = forwardRef<
  { focus: () => void },
  {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    options: SelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    name?: string;
    searchThreshold?: number;
    loading?: boolean;
    disabled?: boolean;
    clearable?: boolean;
    hideLabel?: boolean;
    /** Shown when the search finds nothing: e.g. "Use “Kpalimé”" — handed what was typed. */
    emptyAction?: { label: (q: string) => string; onSelect: (q: string) => void };
    /** How the chosen option reads in the closed field (default: its label). */
    display?: (o: SelectOption) => ReactNode;
    /** Title of the phone sheet when the label is hidden or too short. */
    sheetTitle?: string;
  }
>(function SelectField(
  { label, required, error, hint, options, value, onChange, placeholder, name, searchThreshold = 8, loading, disabled, clearable = true, hideLabel, emptyAction, display, sheetTitle },
  ref,
) {
  const { t } = useI18n();
  const id = useId();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<{ left: number; width: number; maxHeight: number; top?: number; bottom?: number } | null>(null);

  useImperativeHandle(ref, () => ({ focus: () => triggerRef.current?.focus() }));

  const hasSearch = options.length >= searchThreshold;
  const chosen = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.keywords ?? ""}`.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").includes(q));
  }, [options, query]);

  // Desktop: close on outside click / page scroll.
  useEffect(() => {
    if (!open || isMobile) return;
    const down = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!triggerRef.current?.contains(n) && !panelRef.current?.contains(n)) setOpen(false);
    };
    const scroll = (e: Event) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", down);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open, isMobile]);

  // Desktop: place the panel under (or above) the trigger.
  useEffect(() => {
    if (!open || isMobile || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const estimate = Math.min(340, (hasSearch ? 52 : 0) + Math.max(1, options.length) * 44 + 8);
    const below = window.innerHeight - r.bottom;
    const up = below < estimate && r.top > below;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- measured placement on open
    setPanel({ left: r.left, width: r.width, maxHeight: Math.min(340, (up ? r.top : below) - 12), top: up ? undefined : r.bottom + 6, bottom: up ? window.innerHeight - r.top + 6 : undefined });
    return () => setPanel(null);
  }, [open, isMobile, hasSearch, options.length]);

  useEffect(() => {
    if (open && panel && hasSearch && !isMobile) searchRef.current?.focus();
  }, [open, panel, hasSearch, isMobile]);

  function commit(o: SelectOption) {
    onChange(o.value);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActive((p) => (p + (e.key === "ArrowDown" ? 1 : -1) + filtered.length) % Math.max(filtered.length, 1));
    } else if (e.key === "Enter" && open && filtered[active]) {
      e.preventDefault();
      commit(filtered[active]);
    }
  }

  const emptyRow =
    emptyAction && query.trim() ? (
      <button
        type="button"
        onClick={() => {
          emptyAction.onSelect(query.trim());
          setOpen(false);
          setQuery("");
        }}
        className="mt-2 flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-dashed border-ember px-3 text-sm font-bold text-ember"
      >
        {emptyAction.label(query.trim())}
      </button>
    ) : null;

  const row = (o: SelectOption, i: number, mobile: boolean) => {
    const selected = o.value === value;
    return (
      <li
        key={o.value}
        id={`${id}-opt-${i}`}
        role="option"
        aria-selected={selected}
        tabIndex={mobile ? 0 : -1}
        onPointerDown={mobile ? undefined : (e) => { e.preventDefault(); commit(o); }}
        onClick={mobile ? () => commit(o) : undefined}
        onKeyDown={mobile ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(o); } } : undefined}
        onMouseEnter={() => setActive(i)}
        className={`flex cursor-pointer items-center gap-3 ${mobile ? "min-h-14 border-b border-line px-1 text-base" : "px-4 py-2.5 text-sm"} ${
          selected ? "font-bold text-ember" : !mobile && i === active ? "bg-ink-3 text-ivory" : "text-ivory hover:bg-ink-3"
        }`}
      >
        {o.leading && <span className="shrink-0 text-lg leading-none">{o.leading}</span>}
        <span className="min-w-0 flex-1 truncate">{o.label}</span>
        {o.hint && <span className="shrink-0 text-xs text-dust">{o.hint}</span>}
        {selected && <Check className="size-4 shrink-0" />}
      </li>
    );
  };

  const searchBox = (mobile: boolean) =>
    hasSearch && (
      <div className={`flex items-center gap-2 ${mobile ? "input mb-2" : "border-b border-line px-3"}`}>
        <Search className="size-4 shrink-0 text-dust" />
        <input
          ref={mobile ? undefined : searchRef}
          type="search"
          role={mobile ? undefined : "combobox"}
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={!mobile && filtered[active] ? `${id}-opt-${active}` : undefined}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={mobile ? undefined : onKeyDown}
          placeholder={t.ui.search}
          aria-label={t.ui.search}
          className={`w-full bg-transparent text-ivory outline-none placeholder:text-dust ${mobile ? "" : "min-h-11 text-sm"}`}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label={t.ui.clearSearch} className="shrink-0 text-dust hover:text-ivory"><X className="size-4" /></button>
        )}
      </div>
    );

  const errorText = error ? ((t.flow.errors as Record<string, unknown>)[error] as string | undefined) ?? error : undefined;

  return (
    <div className="field">
      <label htmlFor={id} className={hideLabel ? "sr-only" : "label"}>
        {label}
        {required && <span className="req" aria-hidden>*</span>}
      </label>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        role={hasSearch ? undefined : "combobox"}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-invalid={errorText ? true : undefined}
        aria-required={!hasSearch && required ? true : undefined}
        aria-describedby={errorText || hint ? `${id}-m` : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={`input flex items-center justify-between gap-3 text-left disabled:opacity-50 ${open && !isMobile ? "border-ember" : ""}`}
      >
        <span className={`flex min-w-0 items-center gap-2.5 ${chosen ? "text-ivory" : "text-dust"}`}>
          {chosen?.leading && !display && <span className="shrink-0 text-lg leading-none">{chosen.leading}</span>}
          <span className="truncate">{chosen ? (display ? display(chosen) : chosen.label) : value || (placeholder ?? t.ui.choose)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-dust">
          {loading && <LoaderCircle className="size-4 animate-spin" />}
          {clearable && value && !required && (
            <span role="button" tabIndex={0} aria-label={t.ui.clear} onClick={(e) => { e.stopPropagation(); onChange(""); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onChange(""); } }} className="rounded p-0.5 hover:text-ivory">
              <X className="size-4" />
            </span>
          )}
          <ChevronDown className={`size-4 transition-transform ${open && !isMobile ? "rotate-180" : ""}`} />
        </span>
      </button>
      {(errorText || hint) && <p id={`${id}-m`} className={errorText ? "error" : "hint"} role={errorText ? "alert" : undefined}>{errorText ?? hint}</p>}

      {open && !isMobile && panel && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", left: panel.left, width: Math.max(panel.width, 240), maxHeight: panel.maxHeight, ...(panel.top !== undefined ? { top: panel.top } : { bottom: panel.bottom }) }}
            className="z-[9999] flex flex-col overflow-hidden rounded-2xl border border-line-2 bg-ink-2 shadow-[var(--shadow)]"
          >
            {searchBox(false)}
            <ul id={`${id}-list`} role="listbox" aria-label={label} className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
              {filtered.length === 0 && <li className="px-4 py-3 text-sm text-dust">{t.ui.noMatches}</li>}
              {filtered.length === 0 && emptyRow && <li className="px-3 pb-3">{emptyRow}</li>}
              {filtered.map((o, i) => row(o, i, false))}
            </ul>
          </div>,
          document.body,
        )}

      {isMobile && (
        <BottomSheet open={open} onClose={() => { setOpen(false); setQuery(""); }} title={sheetTitle ?? label} closeLabel={t.ui.close}>
          {searchBox(true)}
          <ul id={`${id}-list`} role="listbox" aria-label={label} className={hasSearch ? "min-h-[50dvh]" : undefined}>
            {filtered.length === 0 && <li className="py-4 text-dust">{t.ui.noMatches}</li>}
            {filtered.length === 0 && emptyRow && <li className="pb-2">{emptyRow}</li>}
            {filtered.map((o, i) => row(o, i, true))}
          </ul>
        </BottomSheet>
      )}
    </div>
  );
});
