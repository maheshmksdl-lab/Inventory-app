"use client";

import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fieldClass } from "@/components/shared/inventory-ui";
import { useHydrated } from "@/hooks/use-hydrated";
import { useWarehouseScope } from "@/hooks/use-warehouse-scope";
import { WAREHOUSES } from "@/lib/mock-data/warehouses";
import type { WarehouseScope } from "@/lib/types/inventory";
import { cn } from "@/lib/utils";

/** The app-wide warehouse selector. Every copy (header, page toolbars) edits the same setting. */
export function WarehouseSelect({ className }: { className?: string }) {
  const [scope, setScope] = useWarehouseScope();
  const hydrated = useHydrated();
  return (
    <Select value={hydrated ? scope : "all"} onValueChange={(v) => setScope(v as WarehouseScope)}>
      <SelectTrigger aria-label="Warehouse" className={cn(fieldClass, "w-auto min-w-[170px] gap-2 font-medium text-ink", className)}>
        <BuildingsIcon size={16} aria-hidden className="text-ink-muted" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        <SelectItem value="all">All Warehouses</SelectItem>
        {WAREHOUSES.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
