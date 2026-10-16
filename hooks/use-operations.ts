"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryKeys } from "@/hooks/use-inventory";
import { useHydrated } from "@/hooks/use-hydrated";
import { listMovements, listProducts } from "@/lib/api/inventory";
import { deleteCatalogEntry, getRecord, getSettings, listRecords, peekNumber, saveRecord, saveSettings, type CollectionKey, type RecordOf } from "@/lib/api/operations";
import type { WarehouseScope } from "@/lib/types/inventory";
import type { AppSettings } from "@/lib/types/operations";

/**
 * Data hooks for the operations modules. Like the item views, data is withheld
 * until hydration so server HTML always matches the first client render.
 */
const opsKeys = {
  records: (kind: CollectionKey) => [...inventoryKeys.all, "records", kind] as const,
  record: (kind: CollectionKey, id: string) => [...inventoryKeys.all, "record", kind, id] as const,
  products: (scope: WarehouseScope) => [...inventoryKeys.all, "products", scope] as const,
  movements: [...inventoryKeys.all, "ledger"] as const,
  settings: [...inventoryKeys.all, "settings"] as const,
  number: (kind: CollectionKey) => [...inventoryKeys.all, "next-number", kind] as const,
};

function gated<T extends { data: unknown }>(q: T, hydrated: boolean): T {
  return hydrated ? q : { ...q, data: undefined };
}

export function useRecords<K extends CollectionKey>(kind: K) {
  const hydrated = useHydrated();
  return gated(useQuery({ queryKey: opsKeys.records(kind), queryFn: () => listRecords(kind) }), hydrated);
}

export function useRecord<K extends CollectionKey>(kind: K, id: string) {
  const hydrated = useHydrated();
  // An empty id (e.g. "create" mode on a shared create / edit form) skips the request.
  return gated(useQuery({ queryKey: opsKeys.record(kind, id), queryFn: () => getRecord(kind, id), retry: false, enabled: id !== "" }), hydrated);
}

export function useProducts(scope: WarehouseScope = "all") {
  const hydrated = useHydrated();
  return gated(useQuery({ queryKey: opsKeys.products(scope), queryFn: () => listProducts(scope) }), hydrated);
}

export function useLedger() {
  const hydrated = useHydrated();
  return gated(useQuery({ queryKey: opsKeys.movements, queryFn: listMovements }), hydrated);
}

export function useSettings() {
  const hydrated = useHydrated();
  return gated(useQuery({ queryKey: opsKeys.settings, queryFn: getSettings }), hydrated);
}

export function useNextNumber(kind: CollectionKey) {
  const hydrated = useHydrated();
  return gated(useQuery({ queryKey: opsKeys.number(kind), queryFn: () => peekNumber(kind) }), hydrated);
}

/** Saves refresh every inventory view (and lookups, which list categories, brands and units). */
function useInvalidate() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: inventoryKeys.all }), qc.invalidateQueries({ queryKey: inventoryKeys.lookups })]);
}

export function useSaveRecord<K extends CollectionKey>(kind: K) {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (rec: RecordOf<K>) => saveRecord(kind, rec), onSuccess: invalidate });
}

export function useDeleteCatalogEntry(kind: "categories" | "brands") {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (id: string) => deleteCatalogEntry(kind, id), onSuccess: invalidate });
}

export function useSaveSettings() {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (s: AppSettings) => saveSettings(s), onSuccess: invalidate });
}
