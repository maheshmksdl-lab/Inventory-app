"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False during SSR and hydration, true afterwards. Data-driven client views
 * render their skeleton until then, so server HTML always matches the first
 * client render even when the query cache already has data.
 */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
