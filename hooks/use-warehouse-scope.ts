"use client";

import { useStoredState } from "@/hooks/use-stored-state";
import type { WarehouseScope } from "@/lib/types/inventory";

const ALL: WarehouseScope = "all";
const VALID: WarehouseScope[] = ["all", "wh-main", "wh-branch", "wh-remote"];

/** The warehouse the whole app is looking at (header selector), remembered in this browser. */
export function useWarehouseScope() {
  const [value, set] = useStoredState<WarehouseScope>("evoq-inventory:warehouse", ALL);
  return [VALID.includes(value) ? value : ALL, set] as const;
}
