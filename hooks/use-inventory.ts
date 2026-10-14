"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createItem, getDashboard, getItem, getLookups, listItemMovements, listItems, searchItems, setLifecycle, updateItem } from "@/lib/api/inventory";
import type { ItemInput, ItemQuery } from "@/lib/schemas/item";
import type { WarehouseScope } from "@/lib/types/inventory";

export const inventoryKeys = {
  all: ["inventory"] as const,
  lookups: ["lookups"] as const,
  items: (query: ItemQuery, scope: WarehouseScope) => [...inventoryKeys.all, "items", query, scope] as const,
  item: (id: string) => [...inventoryKeys.all, "item", id] as const,
  movements: (id: string) => [...inventoryKeys.all, "movements", id] as const,
  dashboard: (scope: WarehouseScope, days: number) => [...inventoryKeys.all, "dashboard", scope, days] as const,
  search: (term: string) => [...inventoryKeys.all, "search", term] as const,
};

export function useLookups() {
  return useQuery({ queryKey: inventoryKeys.lookups, queryFn: getLookups, staleTime: Infinity });
}

export function useItems(query: ItemQuery, scope: WarehouseScope) {
  return useQuery({ queryKey: inventoryKeys.items(query, scope), queryFn: () => listItems(query, scope), placeholderData: keepPreviousData });
}

export function useItem(id: string) {
  return useQuery({ queryKey: inventoryKeys.item(id), queryFn: () => getItem(id), retry: false });
}

export function useItemMovements(id: string, enabled = true) {
  return useQuery({ queryKey: inventoryKeys.movements(id), queryFn: () => listItemMovements(id), enabled });
}

export function useDashboard(scope: WarehouseScope, days: number) {
  return useQuery({ queryKey: inventoryKeys.dashboard(scope, days), queryFn: () => getDashboard(scope, days), placeholderData: keepPreviousData });
}

export function useItemSearch(term: string) {
  return useQuery({ queryKey: inventoryKeys.search(term), queryFn: () => searchItems(term), enabled: term.trim().length > 0, placeholderData: keepPreviousData });
}

/** Every inventory view reads the same store, so a change refreshes them all. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: inventoryKeys.all });
}

export function useCreateItem() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (input: ItemInput) => createItem(input), onSuccess: invalidate });
}

export function useUpdateItem(id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (input: ItemInput) => updateItem(id, input), onSuccess: invalidate });
}

export function useSetLifecycle() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ ids, lifecycle }: { ids: string[]; lifecycle: "archived" | "active" }) => setLifecycle(ids, lifecycle),
    onSettled: invalidate,
  });
}
