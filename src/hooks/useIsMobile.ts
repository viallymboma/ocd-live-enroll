"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 767px)";

/** True on phone widths. Server render = false (desktop), then corrects on hydration. */
export function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(QUERY);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
