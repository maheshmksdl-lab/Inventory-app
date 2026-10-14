"use client";

import { useSyncExternalStore } from "react";

/** SSR-safe media query; returns `fallback` on the server. */
export function useMediaQuery(query: string, fallback = true) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}
