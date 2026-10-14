/**
 * Mock Inventory API — the only module to replace when a backend exists.
 * State lives in memory in this browser tab and resets on reload; nothing is
 * sent to a server. Every screen reads through these functions, so an edit
 * made here shows up on the listing, the details page and the dashboard alike.
 */
import { addDays, nowIso } from "@/lib/format";
import { available, OPEN_SO, PENDING_PO, PO_STATUSES, SO_STATUSES, stockStatusOf, toRow } from "@/lib/inventory-meta";
import { DEMO_TODAY } from "@/lib/mock-data/movements";
import { TAX_CLASSES } from "@/lib/mock-data/products";
import { VENDORS, WAREHOUSE_IDS, WAREHOUSES } from "@/lib/mock-data/warehouses";
import { clone, collections, CURRENT_USER, delay, movements, products, settings } from "./store";
import type { ItemInput, ItemQuery } from "@/lib/schemas/item";
import type {
  DashboardData,
  Lifecycle,
  LowStockAlert,
  Product,
  ProductActivity,
  ProductRow,
  PurchaseOrderStatus,
  SalesOrderStatus,
  StockMovement,
  TopSeller,
  TrendPoint,
  WarehouseId,
  WarehouseScope,
} from "@/lib/types/inventory";

let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++seq}`;

export class ApiError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

// ── Lookups ──────────────────────────────────────────────────────────

export interface Lookups {
  warehouses: typeof WAREHOUSES;
  vendors: typeof VENDORS;
  categories: string[];
  brands: string[];
  units: string[];
  taxClasses: string[];
}

/** Categories and brands come from Categories & Brands (active entries only); units from Settings. */
export async function getLookups(): Promise<Lookups> {
  await delay(60);
  const { categories, brands } = collections();
  const names = (list: typeof categories) => list.filter((c) => c.status === "active").map((c) => c.name);
  return clone({ warehouses: WAREHOUSES, vendors: VENDORS, categories: names(categories), brands: names(brands), units: settings().units, taxClasses: TAX_CLASSES });
}

/** Every product with totals for a scope (archived included; callers filter). */
export async function listProducts(scope: WarehouseScope = "all"): Promise<ProductRow[]> {
  await delay(80);
  return clone(products().map((p) => toRow(p, scope)));
}

/** The full stock movement ledger, newest first. */
export async function listMovements(): Promise<StockMovement[]> {
  await delay();
  return clone(movements());
}

// ── Items ────────────────────────────────────────────────────────────

export interface ItemListResult {
  items: ProductRow[];
  /** Rows matching the filters (before paging). */
  total: number;
  page: number;
  pageCount: number;
  /** Summary cards — for the scope, ignoring the other filters. */
  summary: { total: number; active: number; lowStock: number; outOfStock: number };
  /** Every matching row, for exporting the filtered list. */
  allIds: string[];
}

const SORT_KEY: Record<ItemQuery["sort"], (r: ProductRow) => string | number> = {
  name: (r) => r.name.toLowerCase(),
  sku: (r) => r.sku,
  category: (r) => r.category,
  onHand: (r) => r.onHand,
  reserved: (r) => r.reserved,
  available: (r) => r.available,
  reorderPoint: (r) => r.scopeReorderPoint,
  cost: (r) => r.costPrice,
  price: (r) => r.sellingPrice,
  value: (r) => r.stockValue,
  updated: (r) => r.updatedAt,
};

export function filterRows(rows: ProductRow[], q: ItemQuery): ProductRow[] {
  const term = q.q.trim().toLowerCase();
  return rows.filter((r) => {
    if (q.lifecycle ? r.lifecycle !== q.lifecycle : r.lifecycle === "archived") return false;
    if (term && ![r.name, r.sku, r.barcode].some((v) => v.toLowerCase().includes(term))) return false;
    if (q.category && r.category !== q.category) return false;
    if (q.brand && r.brand !== q.brand) return false;
    if (q.type && r.type !== q.type) return false;
    // Stock status filters apply to active items; inactive ones are not replenished.
    if (q.stock && (r.lifecycle !== "active" || r.stockStatus !== q.stock)) return false;
    return true;
  });
}

export async function listItems(query: ItemQuery, scope: WarehouseScope): Promise<ItemListResult> {
  await delay();
  const rows = products().map((p) => toRow(p, scope));
  const live = rows.filter((r) => r.lifecycle !== "archived");
  const active = live.filter((r) => r.lifecycle === "active");
  const summary = {
    total: live.length,
    active: active.length,
    lowStock: active.filter((r) => r.stockStatus === "low-stock").length,
    outOfStock: active.filter((r) => r.stockStatus === "out-of-stock").length,
  };

  const key = SORT_KEY[query.sort];
  const dir = query.dir === "asc" ? 1 : -1;
  const matching = filterRows(rows, query).sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka < kb) return -dir;
    if (ka > kb) return dir;
    return a.name.localeCompare(b.name);
  });

  const pageCount = Math.max(1, Math.ceil(matching.length / query.size));
  const page = Math.min(query.page, pageCount);
  const items = matching.slice((page - 1) * query.size, page * query.size);
  return clone({ items, total: matching.length, page, pageCount, summary, allIds: matching.map((r) => r.id) });
}

export async function getItemsByIds(ids: string[], scope: WarehouseScope): Promise<ProductRow[]> {
  await delay(60);
  const set = new Set(ids);
  return clone(products().filter((p) => set.has(p.id)).map((p) => toRow(p, scope)));
}

export interface ItemDetail {
  item: ProductRow;
  warehouses: (ProductRow["stock"][number] & { available: number; status: ReturnType<typeof stockStatusOf> })[];
}

export async function getItem(id: string): Promise<ItemDetail> {
  await delay();
  const p = products().find((x) => x.id === id);
  if (!p) throw new ApiError("Item not found");
  return clone({
    item: toRow(p, "all"),
    warehouses: p.stock.map((b) => ({ ...b, available: available(b), status: stockStatusOf(available(b), b.reorderPoint) })),
  });
}

function assertUniqueSku(sku: string, exceptId?: string) {
  const clash = products().find((p) => p.id !== exceptId && p.sku.toUpperCase() === sku.toUpperCase());
  if (clash) throw new ApiError(`SKU ${sku} is already used by ${clash.name}`, "sku");
}

function log(p: Product, kind: ProductActivity["kind"], text: string) {
  p.activity.unshift({ id: newId("act"), kind, text, user: CURRENT_USER, at: nowIso() });
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "item";

/**
 * New items start with no stock in any warehouse: opening stock is a stock
 * transaction (goods receipt or adjustment), and those modules aren't built yet.
 */
export async function createItem(input: ItemInput): Promise<ProductRow> {
  await delay();
  assertUniqueSku(input.sku);
  let id = slug(input.name);
  // "new" is the create-item route.
  if (id === "new" || products().some((p) => p.id === id)) id = `${id}-${Date.now().toString(36)}`;
  const at = nowIso();
  // Split the item-level reorder point across warehouses as a starting point.
  const shares = [0.5, 0.3, 0.2];
  const p: Product = {
    id,
    ...input,
    icon: "box",
    stock: WAREHOUSE_IDS.map((warehouseId, i) => ({ warehouseId, onHand: 0, reserved: 0, reorderPoint: Math.round(input.reorderPoint * shares[i]) })),
    suppliers: [],
    activity: [],
    createdAt: at,
    updatedAt: at,
  };
  log(p, "created", "Item created");
  products().unshift(p);
  return clone(toRow(p, "all"));
}

const FIELD_LABEL: Partial<Record<keyof ItemInput, string>> = {
  name: "name",
  sku: "SKU",
  description: "description",
  category: "category",
  brand: "brand",
  type: "item type",
  barcode: "barcode",
  unit: "unit",
  taxClass: "tax class",
  reorderPoint: "reorder point",
};

export async function updateItem(id: string, input: ItemInput): Promise<ProductRow> {
  await delay();
  const p = products().find((x) => x.id === id);
  if (!p) throw new ApiError("Item not found");
  if (p.lifecycle === "archived") throw new ApiError("Restore this item before editing it");
  assertUniqueSku(input.sku, id);

  const changed = (Object.keys(FIELD_LABEL) as (keyof ItemInput)[]).filter((k) => p[k] !== input[k]).map((k) => FIELD_LABEL[k]!);
  const priceChanges: string[] = [];
  if (p.costPrice !== input.costPrice) priceChanges.push("cost price");
  if (p.sellingPrice !== input.sellingPrice) priceChanges.push("selling price");
  const statusChanged = p.lifecycle !== input.lifecycle;

  Object.assign(p, input, { updatedAt: nowIso() });
  if (changed.length) log(p, "updated", `Updated ${changed.join(", ")}`);
  if (priceChanges.length) log(p, "price", `Changed ${priceChanges.join(" and ")}`);
  if (statusChanged) log(p, "status", `Status changed to ${input.lifecycle === "active" ? "Active" : "Inactive"}`);
  return clone(toRow(p, "all"));
}

/** Archive or restore items. Restored items come back as Active. */
export async function setLifecycle(ids: string[], lifecycle: Extract<Lifecycle, "archived" | "active">): Promise<number> {
  await delay();
  let n = 0;
  for (const p of products()) {
    if (!ids.includes(p.id)) continue;
    if (lifecycle === "archived" && p.lifecycle !== "archived") {
      p.lifecycle = "archived";
      log(p, "archived", "Item archived");
    } else if (lifecycle === "active" && p.lifecycle === "archived") {
      p.lifecycle = "active";
      log(p, "restored", "Item restored");
    } else continue;
    p.updatedAt = nowIso();
    n++;
  }
  return n;
}

// ── Movements ────────────────────────────────────────────────────────

const inScope = (m: StockMovement, scope: WarehouseScope) => scope === "all" || m.from === scope || m.to === scope;

export async function listItemMovements(productId: string): Promise<StockMovement[]> {
  await delay();
  return clone(movements().filter((m) => m.productId === productId));
}

// ── Dashboard ────────────────────────────────────────────────────────

export async function getDashboard(scope: WarehouseScope, days: number): Promise<DashboardData> {
  await delay(200 + Math.random() * 200);
  const end = DEMO_TODAY;
  const start = addDays(end, -(days - 1));
  const all = products();
  const rows = all.filter((p) => p.lifecycle !== "archived").map((p) => toRow(p, scope));
  const activeRows = rows.filter((r) => r.lifecycle === "active");
  const byId = new Map(all.map((p) => [p.id, p]));

  // Low-stock alerts are per warehouse location: that is where a reorder lands.
  const whs: WarehouseId[] = scope === "all" ? WAREHOUSE_IDS : [scope];
  const alerts: LowStockAlert[] = [];
  for (const p of all) {
    if (p.lifecycle !== "active") continue;
    for (const b of p.stock) {
      if (!whs.includes(b.warehouseId) || b.reorderPoint <= 0) continue;
      const avail = available(b);
      const status = stockStatusOf(avail, b.reorderPoint);
      if (status === "in-stock") continue;
      alerts.push({ productId: p.id, name: p.name, sku: p.sku, icon: p.icon, warehouseId: b.warehouseId, available: avail, reorderPoint: b.reorderPoint, status });
    }
  }
  alerts.sort((a, b) => a.available / a.reorderPoint - b.available / b.reorderPoint || b.reorderPoint - a.reorderPoint);

  const ranged = movements().filter((m) => m.at.slice(0, 10) >= start && m.at.slice(0, 10) <= end && inScope(m, scope));

  // Received = goods receipts into the scope; issued = sales issues out of it.
  const byDay = new Map<string, TrendPoint>();
  for (let i = 0; i < days; i++) {
    const d = addDays(start, i);
    byDay.set(d, { date: d, received: 0, issued: 0 });
  }
  for (const m of ranged) {
    const pt = byDay.get(m.at.slice(0, 10));
    if (!pt) continue;
    if (m.type === "received") pt.received += m.quantity;
    if (m.type === "issued") pt.issued += Math.abs(m.quantity);
  }

  const sold = new Map<string, number>();
  for (const m of ranged) if (m.type === "issued") sold.set(m.productId, (sold.get(m.productId) ?? 0) + Math.abs(m.quantity));
  const topSellers: TopSeller[] = [...sold.entries()]
    .map(([productId, quantity]) => {
      const p = byId.get(productId)!;
      return { productId, name: p.name, sku: p.sku, icon: p.icon, quantity, revenue: quantity * p.sellingPrice };
    })
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Counted from the Purchase Orders and Sales Orders lists, so the dashboard always agrees with them.
  const scopedWh: string[] = scope === "all" ? WAREHOUSE_IDS : [scope];
  const countBy = <S extends string>(docs: { status: S; warehouseId: string }[], statuses: { value: S }[]) =>
    Object.fromEntries(statuses.map((s) => [s.value, docs.filter((d) => d.status === s.value && scopedWh.includes(d.warehouseId)).length])) as Record<S, number>;
  const purchaseOrders = countBy<PurchaseOrderStatus>(collections().purchaseOrders, PO_STATUSES);
  const salesOrders = countBy<SalesOrderStatus>(collections().salesOrders, SO_STATUSES);

  const live = all.filter((p) => p.lifecycle !== "archived");
  const warehouses = WAREHOUSES.map((w) => {
    let skus = 0;
    let quantity = 0;
    let value = 0;
    let lowStock = 0;
    for (const p of live) {
      const b = p.stock.find((x) => x.warehouseId === w.id);
      if (!b) continue;
      if (b.onHand > 0) skus++;
      quantity += b.onHand;
      value += b.onHand * p.costPrice;
      if (p.lifecycle === "active" && b.reorderPoint > 0 && available(b) <= b.reorderPoint) lowStock++;
    }
    return { warehouseId: w.id, skus, quantity, value, lowStock };
  });

  return clone({
    range: { start, end, days },
    kpis: {
      totalProducts: rows.length,
      activeProducts: activeRows.length,
      stockOnHand: rows.reduce((s, r) => s + r.onHand, 0),
      reserved: rows.reduce((s, r) => s + r.reserved, 0),
      inventoryValue: rows.reduce((s, r) => s + r.stockValue, 0),
      lowStock: activeRows.filter((r) => r.stockStatus === "low-stock").length,
      lowStockLocations: alerts.length,
      outOfStock: activeRows.filter((r) => r.stockStatus === "out-of-stock").length,
      pendingPurchaseOrders: PENDING_PO.reduce((n, s) => n + purchaseOrders[s], 0),
      openSalesOrders: OPEN_SO.reduce((n, s) => n + salesOrders[s], 0),
      movements: ranged.length,
    },
    trend: [...byDay.values()],
    lowStock: alerts.slice(0, 5),
    lowStockTotal: alerts.length,
    purchaseOrders,
    salesOrders,
    recentMovements: ranged.slice(0, 6),
    movementProducts: Object.fromEntries(ranged.slice(0, 6).map((m) => [m.productId, { name: byId.get(m.productId)!.name, icon: byId.get(m.productId)!.icon }])),
    warehouses,
    topSellers,
  });
}

// ── Global search (header) ───────────────────────────────────────────

export async function searchItems(term: string): Promise<Pick<Product, "id" | "name" | "sku" | "icon" | "lifecycle">[]> {
  await delay(60);
  const t = term.trim().toLowerCase();
  if (!t) return [];
  return products()
    .filter((p) => [p.name, p.sku, p.barcode].some((v) => v.toLowerCase().includes(t)))
    .slice(0, 6)
    .map(({ id, name, sku, icon, lifecycle }) => ({ id, name, sku, icon, lifecycle }));
}
