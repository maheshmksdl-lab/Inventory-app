"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A small value kept in browser storage (preferences only — never project data),
 * shared live between every component that reads the same key. Storage can be
 * unavailable (private mode, blocked site data); the default value is used then.
 */
type Area = "local" | "session";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const cache = new Map<string, { raw: string | null; value: unknown }>();

function storage(area: Area): Storage | null {
  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function read<T>(area: Area, key: string, fallback: T): T {
  const id = `${area}:${key}`;
  const hit = cache.get(id);
  const s = storage(area);
  if (!s) return hit ? (hit.value as T) : fallback;
  let raw: string | null = null;
  try {
    raw = s.getItem(key);
  } catch {
    return hit ? (hit.value as T) : fallback;
  }
  // Same raw string → same object, so useSyncExternalStore sees a stable snapshot.
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(id, { raw, value });
  return value;
}

/** `fallback` must be a stable reference (a module-level constant). */
export function useStoredState<T>(key: string, fallback: T, area: Area = "local") {
  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => e.key === key && cb();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(cb);
      window.removeEventListener("storage", onStorage);
    };
  }, [key]);
  const value = useSyncExternalStore(
    subscribe,
    () => read(area, key, fallback),
    () => fallback,
  );
  const set = useCallback(
    (next: T) => {
      try {
        storage(area)?.setItem(key, JSON.stringify(next));
      } catch {
        // Storage unavailable: keep the value for this page view only.
        cache.set(`${area}:${key}`, { raw: JSON.stringify(next), value: next });
      }
      emit();
    },
    [area, key],
  );
  return [value, set] as const;
}
