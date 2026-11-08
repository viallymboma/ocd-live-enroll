"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The landing header's behaviour:
 *  - at the top of the page: full width, transparent, over the hero;
 *  - once scrolled: a FLOATING pill (blurred, shadowed) fixed at the top;
 *  - scrolling DOWN hides it (more room to read), scrolling UP brings it back at once;
 *  - never hidden while it holds the keyboard focus.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [floating, setFloating] = useState(false);
  const [hidden, setHidden] = useState(false);
  const focusInside = useRef(false);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const dy = y - last;
      const isFloating = y > 80;
      setFloating(isFloating);
      if (!isFloating || focusInside.current) setHidden(false);
      else if (dy > 6) setHidden(true); // going down
      else if (dy < -6) setHidden(false); // going up
      if (Math.abs(dy) > 6 || !isFloating) last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      data-floating={floating || undefined}
      onFocusCapture={() => {
        focusInside.current = true;
        setHidden(false);
      }}
      onBlurCapture={() => (focusInside.current = false)}
      className={`site-header fixed inset-x-0 top-0 z-40 px-3 transition-transform duration-500 ease-out-expo sm:px-6 ${hidden ? "-translate-y-[130%]" : "translate-y-0"}`}
    >
      <div
        className={`mx-auto flex items-center justify-between transition-[max-width,margin,padding,background-color,border-color,box-shadow,border-radius] duration-500 ease-out-expo ${
          floating
            ? "mt-3 max-w-[1180px] rounded-full border border-line bg-ink-2/80 py-2 pl-4 pr-2 shadow-[0_18px_50px_-22px_rgb(40_20_5/0.45)] backdrop-blur-xl sm:pl-6"
            : "mt-0 max-w-[1400px] rounded-none border border-transparent px-1 py-4 sm:px-2 sm:py-6"
        }`}
      >
        {children}
      </div>
    </header>
  );
}
