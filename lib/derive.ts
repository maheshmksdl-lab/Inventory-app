/**
 * Calculations shared by several screens (warehouses, reorder alerts,
 * valuation, reports), so each figure is derived one way from the same demo data.
 */
import { available, stockStatusOf } from "@/lib/inventory-meta";
import type { ProductRow, StockStatus } from "@/lib/types/inventory";
import type { AppSettings, PurchaseOrder, StorageZone, WarehouseRecord } from "@/lib/types/operations";

// ── Warehouses ───────────────────────────────────────────────────────

export interface WarehouseStats {
  skus: number;
  units: number;
  reserved: number;
  value: number;
  lowStock: number;
  outOfStock: number;
}

export function warehouseStats(products: ProductRow[], warehouseId: string): WarehouseStats {
  const s: WarehouseStats = { skus: 0, units: 0, reserved: 0, value: 0, lowStock: 0, outOfStock: 0 };
  for (const p of products) {
    if (p.lifecycle === "archived") continue;
    const b = p.stock.find((x) => x.warehouseId === warehouseId);
    if (!b) continue;
    if (b.onHand > 0) s.skus++;
    s.units += b.onHand;
    s.reserved += b.reserved;
    s.value += b.onHand * p.costPrice;
    if (p.lifecycle === "active" && b.reorderPoint > 0) {
      const st = stockStatusOf(available(b), b.reorderPoint);
      if (st === "low-stock") s.lowStock++;
      if (st === "out-of-stock") s.outOfStock++;
    }
  }
  return s;
}

/** A stable, illustrative bin code for a product in a warehouse (e.g. "B-07-2"). */
export function binFor(productId: string, category: string, costPrice: number, zones: StorageZone[]): string {
  if (!zones.length) return "Unassigned";
  const pickZone = (kind: StorageZone["kind"]) => zones.find((z) => z.kind === kind);
  const zone =
    (category === "Furniture" && pickZone("Bulk floor")) ||
    (costPrice >= 15000 && pickZone("Secure cage")) ||
    zones.filter((z) => z.kind === "Racking" || z.kind === "Shelving")[productId.length % 2] ||
    zones[0];
  let h = 0;
  for (const ch of productId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${zone.code}-${String((h % Math.max(1, zone.bins)) + 1).padStart(2, "0")}-${(h % 4) + 1}`;
}

export const warehouseLabel = (warehouses: WarehouseRecord[] | undefined, id: string) => warehouses?.find((w) => w.id === id)?.name ?? "—";

// ── Reorder alerts ───────────────────────────────────────────────────

export type Severity = "critical" | "high" | "medium";

export interface ReorderAlert {
  key: string;
  product: ProductRow;
  warehouseId: string;
  available: number;
  onHand: number;
  reorderPoint: number;
  /** Ordered but not yet received on open purchase orders for this warehouse. */
  incoming: number;
  target: number;
  suggested: number;
  severity: Severity;
  status: Exclude<StockStatus, "in-stock">;
}

const OPEN_PO: PurchaseOrder["status"][] = ["pending-approval", "confirmed", "partially-received"];

/**
 * Per warehouse location, like the dashboard: an active product whose
 * available stock is at or below the warehouse reorder point.
 * Suggested = target − available − incoming (never below zero), where the
 * target is the reorder point, or twice it, per Settings.
 */
export function reorderAlerts(products: ProductRow[], purchaseOrders: PurchaseOrder[], rule: AppSettings["reorderSuggestion"]): ReorderAlert[] {
  const incoming = new Map<string, number>();
  for (const po of purchaseOrders) {
    if (!OPEN_PO.includes(po.status)) continue;
    for (const l of po.lines) {
      const k = `${l.productId}@${po.warehouseId}`;
      incoming.set(k, (incoming.get(k) ?? 0) + Math.max(0, l.quantity - l.received));
    }
  }
  const out: ReorderAlert[] = [];
  for (const p of products) {
    if (p.lifecycle !== "active") continue;
    for (const b of p.stock) {
      if (b.reorderPoint <= 0) continue;
      const avail = available(b);
      const status = stockStatusOf(avail, b.reorderPoint);
      if (status === "in-stock") continue;
      const key = `${p.id}@${b.warehouseId}`;
      const inc = incoming.get(key) ?? 0;
      const target = rule === "double-reorder-point" ? b.reorderPoint * 2 : b.reorderPoint;
      const severity: Severity = avail <= 0 ? "critical" : avail <= b.reorderPoint / 2 ? "high" : "medium";
      out.push({ key, product: p, warehouseId: b.warehouseId, available: avail, onHand: b.onHand, reorderPoint: b.reorderPoint, incoming: inc, target, suggested: Math.max(0, target - avail - inc), severity, status });
    }
  }
  const rank: Record<Severity, number> = { critical: 0, high: 1, medium: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity] || a.available / a.reorderPoint - b.available / b.reorderPoint);
}

// ── Valuation ────────────────────────────────────────────────────────

export type CostBasis = "standard" | "last-purchase";
export const COST_BASIS_LABEL: Record<CostBasis, string> = {
  standard: "Standard cost (item cost price)",
  "last-purchase": "Last purchase cost (preferred supplier)",
};

/** Unit cost under the chosen demo basis. */
export function unitCostOf(p: ProductRow, basis: CostBasis): number {
  if (basis === "last-purchase") return p.suppliers.find((s) => s.preferred)?.lastCost ?? p.suppliers[0]?.lastCost ?? p.costPrice;
  return p.costPrice;
}
