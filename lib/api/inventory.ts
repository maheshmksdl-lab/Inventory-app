/**
 * Mock Inventory API — the only module to replace when a backend exists.
 * State lives in memory in this browser tab and resets on reload; nothing is
 * sent to a server. Every screen reads through these functions, so an edit
 * made here shows up on the listing, the details page and the dashboard alike.
 */
import { addDays, nowIso } from "@/lib/format";
import { available, OPEN_SO, PENDING_PO, PO_STATUSES, SO_STATUSES, stockStatusOf, toRow } from "@/lib/inventory-meta";
import { DEMO_TODAY } from "@/lib/mock-data/movements";
import { INVENTORY_ACCOUNTS, PURCHASE_ACCOUNTS, SALES_ACCOUNTS, TAX_CLASSES } from "@/lib/mock-data/products";
import { VENDORS, WAREHOUSE_IDS, WAREHOUSES } from "@/lib/mock-data/warehouses";
import { clone, collections, CURRENT_USER, delay, movements, products, settings } from "./store";
import type { ItemCreateExtras, ItemInput, ItemQuery } from "@/lib/schemas/item";
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
  /** Active category names, each top-level category followed by its subcategories. */
  categories: string[];
  /** Display label per category name: "Services › Installation" for subcategories. */
  categoryLabels: Record<string, string>;
  brands: string[];
  /** Manufacturers already used on items (Zoho's "select or add"). */
  manufacturers: string[];
  units: string[];
  taxClasses: string[];
  salesAccounts: string[];
  purchaseAccounts: string[];
  inventoryAccounts: string[];
  /** Default valuation method for new items, from Settings. */
  valuationMethod: "fifo" | "weighted-average";
}

/** Category names, parents first with their subcategories under them. */
export function categoryTree(list = collections().categories) {
  const active = list.filter((c) => c.status === "active");
  const top = active.filter((c) => !c.parentId).sort((a, b) => a.name.localeCompare(b.name));
  const labels: Record<string, string> = {};
  const names: string[] = [];
  for (const parent of top) {
    names.push(parent.name);
    labels[parent.name] = parent.name;
    for (const child of active.filter((c) => c.parentId === parent.id).sort((a, b) => a.name.localeCompare(b.name))) {
      names.push(child.name);
      labels[child.name] = `${parent.name} › ${child.name}`;
    }
  }
  return { names, labels };
}

/** Categories and brands come from Categories & Brands (active entries only); units from Settings. */
export async function getLookups(): Promise<Lookups> {
  await delay(60);
  const { brands } = collections();
  const tree = categoryTree();
  const manufacturers = [...new Set(products().map((p) => p.manufacturer).filter(Boolean))].sort();
  return clone({
    warehouses: WAREHOUSES,
    vendors: VENDORS,
    categories: tree.names,
    categoryLabels: tree.labels,
    brands: brands.filter((c) => c.status === "active").map((c) => c.name),
    manufacturers,
    units: settings().units,
    taxClasses: TAX_CLASSES,
    salesAccounts: SALES_ACCOUNTS,
    purchaseAccounts: PURCHASE_ACCOUNTS,
    inventoryAccounts: INVENTORY_ACCOUNTS,
    valuationMethod: settings().costingMethod === "fifo" ? "fifo" : "weighted-average",
  });
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

/** A category and its subcategories: filtering by a parent includes its children. */
function categoryFamily(name: string): Set<string> {
  const list = collections().categories;
  const parent = list.find((c) => c.name === name);
  return new Set([name, ...(parent ? list.filter((c) => c.parentId === parent.id).map((c) => c.name) : [])]);
}

export function filterRows(rows: ProductRow[], q: ItemQuery): ProductRow[] {
  const term = q.q.trim().toLowerCase();
  const family = q.category ? categoryFamily(q.category) : null;
  return rows.filter((r) => {
    if (q.lifecycle ? r.lifecycle !== q.lifecycle : r.lifecycle === "archived") return false;
    if (term && ![r.name, r.sku, r.barcode, r.mpn].some((v) => v.toLowerCase().includes(term))) return false;
    if (family && !family.has(r.category)) return false;
    if (q.brand && r.brand !== q.brand) return false;
    if (q.type && r.type !== q.type) return false;
    // Stock status filters apply to active tracked items; inactive ones are not replenished.
    if (q.stock && (r.lifecycle !== "active" || !r.trackInventory || r.stockStatus !== q.stock)) return false;
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

/** A related item as the details page lists it. */
export type ItemRef = Pick<ProductRow, "id" | "name" | "sku" | "icon" | "image" | "unit" | "lifecycle" | "costPrice" | "sellingPrice" | "available" | "onHand" | "status" | "trackInventory" | "variantValues">;

export interface ItemDetail {
  item: ProductRow;
  warehouses: (ProductRow["stock"][number] & { available: number; status: ReturnType<typeof stockStatusOf> })[];
  /** Variant family: the parent (or this item) and every variant, parent first. Empty when the item has no variants. */
  family: ItemRef[];
  /** The attributes that define the family (from the parent). */
  familyAttributes: Product["attributes"];
  parent: ItemRef | null;
  /** Composite items: each component with its quantity per unit. */
  components: (ItemRef & { quantity: number })[];
  /** Composite items that use this item as a component. */
  usedIn: ItemRef[];
  /** Why the item can't be deleted, or null when it can. */
  deleteBlocker: string | null;
}

const ref = (p: Product): ItemRef => {
  const r = toRow(p, "all");
  return {
    id: r.id,
    name: r.name,
    sku: r.sku,
    icon: r.icon,
    image: r.image,
    unit: r.unit,
    lifecycle: r.lifecycle,
    costPrice: r.costPrice,
    sellingPrice: r.sellingPrice,
    available: r.available,
    onHand: r.onHand,
    status: r.status,
    trackInventory: r.trackInventory,
    variantValues: r.variantValues,
  };
};

export async function getItem(id: string): Promise<ItemDetail> {
  await delay();
  const all = products();
  const p = all.find((x) => x.id === id);
  if (!p) throw new ApiError("Item not found");
  const parent = p.parentId ? all.find((x) => x.id === p.parentId) : undefined;
  const head = parent ?? p;
  const variants = all.filter((x) => x.parentId === head.id);
  const family = head.attributes.length || variants.length ? [head, ...variants] : [];
  return clone({
    item: toRow(p, "all"),
    warehouses: p.stock.map((b) => ({ ...b, available: available(b), status: stockStatusOf(available(b), b.reorderPoint) })),
    family: family.map(ref),
    familyAttributes: head.attributes,
    parent: parent ? ref(parent) : null,
    components: p.components.flatMap((c) => {
      const cp = all.find((x) => x.id === c.productId);
      return cp ? [{ ...ref(cp), quantity: c.quantity }] : [];
    }),
    usedIn: all.filter((x) => x.components.some((c) => c.productId === id)).map(ref),
    deleteBlocker: deleteBlocker(p),
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

export const MAX_IMAGES = 15;

/** Rules a backend would enforce whatever the form sent. */
function checkInput(input: ItemInput, self: Product | null, parentId: string | null) {
  if (input.images.length > MAX_IMAGES) throw new ApiError(`An item can have up to ${MAX_IMAGES} images`);
  if (input.type === "service" && input.trackInventory) throw new ApiError("Services can't track inventory");
  if (input.preferredVendorId && !VENDORS.some((v) => v.id === input.preferredVendorId)) throw new ApiError("Preferred vendor not found", "preferredVendorId");
  if (input.type === "composite") {
    for (const c of input.components) {
      const cp = products().find((x) => x.id === c.productId);
      if (!cp) throw new ApiError("A component item no longer exists", "components");
      if (self && cp.id === self.id) throw new ApiError("A composite item can't contain itself", "components");
      if (cp.type === "composite") throw new ApiError(`${cp.name} is a composite item: components must be goods or services`, "components");
    }
  }
  // Only a top-level goods item defines variant attributes.
  if (input.attributes.length && (input.type !== "goods" || parentId || self?.parentId)) throw new ApiError("Only goods items that aren't variants can define attributes");
}

/** Variant values must match the family's attributes and not repeat a sibling's combination. */
function applyVariant(parent: Product, values: Record<string, string>, selfId?: string) {
  const out: Record<string, string> = {};
  for (const a of parent.attributes) {
    const v = (values[a.name] ?? "").trim();
    if (!v) throw new ApiError(`Choose a ${a.name.toLowerCase()}`, `variantValues.${a.name}`);
    // New options typed on the variant form join the family's list.
    const known = a.options.find((o) => o.toLowerCase() === v.toLowerCase());
    if (!known) a.options.push(v);
    out[a.name] = known ?? v;
  }
  const key = (vals: Record<string, string>) => parent.attributes.map((a) => (vals[a.name] ?? "").toLowerCase()).join("|");
  const family = [parent, ...products().filter((x) => x.parentId === parent.id)];
  const clash = family.find((x) => x.id !== selfId && key(x.variantValues) === key(out));
  if (clash) throw new ApiError(`${clash.name} already has ${Object.values(out).join(" / ")}`, `variantValues.${parent.attributes[0].name}`);
  return out;
}

/**
 * Create an item. Tracked items can start with opening stock per warehouse,
 * recorded as an "Opening stock" adjustment in the movement ledger (as Zoho
 * does). A variant is created from its parent and joins the parent's family.
 */
export async function createItem(input: ItemInput, extras: ItemCreateExtras = { openingStock: {}, openingRate: 0, parentId: null }): Promise<ProductRow> {
  await delay();
  assertUniqueSku(input.sku);
  checkInput(input, null, extras.parentId);
  const parent = extras.parentId ? products().find((x) => x.id === extras.parentId) : undefined;
  if (extras.parentId && (!parent || parent.parentId || parent.type !== "goods")) throw new ApiError("Variants can only be added to goods items");

  let id = slug(input.name);
  // "new" is the create-item route.
  if (id === "new" || products().some((p) => p.id === id)) id = `${id}-${Date.now().toString(36)}`;
  const at = nowIso();
  // Split the item-level reorder point across warehouses as a starting point.
  const shares = [0.5, 0.3, 0.2];
  const variantValues = parent ? applyVariant(parent, input.variantValues) : {};
  const p: Product = {
    id,
    ...input,
    type: parent ? "goods" : input.type,
    attributes: parent ? [] : input.attributes,
    variantValues: parent ? variantValues : input.attributes.length ? input.variantValues : {},
    parentId: parent?.id ?? null,
    image: input.images[0],
    icon: parent?.icon ?? "box",
    stock: WAREHOUSE_IDS.map((warehouseId, i) => ({
      warehouseId,
      onHand: input.trackInventory ? Math.max(0, Math.round(extras.openingStock[warehouseId] ?? 0)) : 0,
      reserved: 0,
      reorderPoint: Math.round(input.reorderPoint * shares[i]),
    })),
    suppliers: input.preferredVendorId ? [{ vendorId: input.preferredVendorId, supplierSku: input.sku, lastCost: input.costPrice, preferred: true }] : [],
    activity: [],
    createdAt: at,
    updatedAt: at,
  };
  log(p, "created", parent ? `Variant created from ${parent.name}` : "Item created");
  if (input.images.length) log(p, "images", `Added ${input.images.length === 1 ? "1 image" : `${input.images.length} images`}`);
  products().unshift(p);
  if (parent) {
    log(parent, "variant", `Variant ${p.name} added`);
    parent.updatedAt = at;
  }

  const opening = p.stock.filter((b) => b.onHand > 0);
  opening.forEach((b, i) =>
    movements().unshift({ id: newId("mv"), at, productId: p.id, type: "adjustment", quantity: b.onHand, from: null, to: b.warehouseId, reference: `Opening stock${opening.length > 1 ? ` ${i + 1}` : ""}`, user: CURRENT_USER }),
  );
  if (opening.length) log(p, "updated", `Opening stock of ${opening.reduce((s, b) => s + b.onHand, 0)} ${p.unit} at ${extras.openingRate.toFixed(2)} per unit`);
  return clone(toRow(p, "all"));
}

const FIELD_LABEL: Partial<Record<keyof ItemInput, string>> = {
  name: "name",
  sku: "SKU",
  description: "sales description",
  purchaseDescription: "purchase description",
  category: "category",
  brand: "brand",
  manufacturer: "manufacturer",
  barcode: "UPC / EAN",
  mpn: "MPN",
  isbn: "ISBN",
  hsnCode: "HSN / SAC code",
  unit: "unit",
  taxClass: "tax rate",
  reorderPoint: "reorder point",
  returnable: "returnable",
  salesAccount: "sales account",
  purchaseAccount: "purchase account",
  inventoryAccount: "inventory account",
  preferredVendorId: "preferred vendor",
  valuationMethod: "valuation method",
  tracking: "advanced tracking",
  sellable: "sales information",
  purchasable: "purchase information",
  dimensions: "dimensions",
  weight: "weight",
  components: "components",
  attributes: "variant attributes",
  variantValues: "variant values",
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function imageChangeText(before: string[], after: string[]) {
  const added = after.filter((x) => !before.includes(x)).length;
  const removed = before.filter((x) => !after.includes(x)).length;
  const parts: string[] = [];
  if (added) parts.push(`added ${added === 1 ? "1 image" : `${added} images`}`);
  if (removed) parts.push(`removed ${removed === 1 ? "1 image" : `${removed} images`}`);
  if (!parts.length && before[0] !== after[0]) parts.push("changed the primary image");
  else if (!parts.length) parts.push("reordered images");
  const text = parts.join(" and ");
  return text[0].toUpperCase() + text.slice(1);
}

export async function updateItem(id: string, input: ItemInput): Promise<ProductRow> {
  await delay();
  const p = products().find((x) => x.id === id);
  if (!p) throw new ApiError("Item not found");
  if (p.lifecycle === "archived") throw new ApiError("Restore this item before editing it");
  // As in Zoho, the type and inventory tracking are fixed once the item exists.
  if (input.type !== p.type) throw new ApiError("An item's type can't be changed after it's created");
  if (input.trackInventory !== p.trackInventory) throw new ApiError("Inventory tracking can't be turned on or off after the item is created");
  assertUniqueSku(input.sku, id);
  checkInput(input, p, p.parentId);
  const parent = p.parentId ? products().find((x) => x.id === p.parentId) : undefined;
  const variantValues = parent ? applyVariant(parent, input.variantValues, p.id) : input.attributes.length ? input.variantValues : {};
  // Removing an attribute the variants still use would orphan them.
  if (!parent && products().some((x) => x.parentId === p.id)) {
    const kept = new Set(input.attributes.map((a) => a.name));
    const lost = p.attributes.find((a) => !kept.has(a.name));
    if (lost) throw new ApiError(`${lost.name} is used by this item's variants and can't be removed`, "attributes");
  }

  const changed = (Object.keys(FIELD_LABEL) as (keyof ItemInput)[]).filter((k) => !same(p[k as keyof Product], k === "variantValues" ? variantValues : input[k])).map((k) => FIELD_LABEL[k]!);
  const priceChanges: string[] = [];
  if (p.costPrice !== input.costPrice) priceChanges.push("cost price");
  if (p.sellingPrice !== input.sellingPrice) priceChanges.push("selling price");
  const statusChanged = p.lifecycle !== input.lifecycle;
  const imagesChanged = !same(p.images, input.images);
  const before = p.images;

  Object.assign(p, input, { variantValues, image: input.images[0], updatedAt: nowIso() });
  if (input.preferredVendorId && !p.suppliers.some((s) => s.vendorId === input.preferredVendorId)) {
    p.suppliers.push({ vendorId: input.preferredVendorId, supplierSku: p.sku, lastCost: p.costPrice, preferred: false });
  }
  p.suppliers.forEach((s) => (s.preferred = s.vendorId === input.preferredVendorId));
  if (changed.length) log(p, "updated", `Updated ${changed.join(", ")}`);
  if (priceChanges.length) log(p, "price", `Changed ${priceChanges.join(" and ")}`);
  if (imagesChanged) log(p, "images", imageChangeText(before, input.images));
  if (statusChanged) log(p, "status", `Status changed to ${input.lifecycle === "active" ? "Active" : "Inactive"}`);
  return clone(toRow(p, "all"));
}

/** Replace an item's images (primary first) without opening the full edit form. */
export async function updateItemImages(id: string, images: string[]): Promise<ProductRow> {
  await delay();
  const p = products().find((x) => x.id === id);
  if (!p) throw new ApiError("Item not found");
  if (p.lifecycle === "archived") throw new ApiError("Restore this item before changing its images");
  if (images.length > MAX_IMAGES) throw new ApiError(`An item can have up to ${MAX_IMAGES} images`);
  if (same(p.images, images)) return clone(toRow(p, "all"));
  log(p, "images", imageChangeText(p.images, images));
  Object.assign(p, { images: [...images], image: images[0], updatedAt: nowIso() });
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

/** Documents that list products on their lines, with a label for messages. */
const DOC_LABEL: Partial<Record<keyof ReturnType<typeof collections>, string>> = {
  purchaseOrders: "purchase orders",
  goodsReceipts: "goods receipts",
  salesOrders: "sales orders",
  fulfilments: "fulfilments",
  salesReturns: "sales returns",
  transfers: "stock transfers",
  adjustments: "stock adjustments",
  stocktakes: "stocktakes",
};

/**
 * As in Zoho, an item that has been used in transactions can't be deleted —
 * only marked inactive or archived — so its history stays intact.
 */
function deleteBlocker(p: Product): string | null {
  const all = products();
  if (all.some((x) => x.parentId === p.id)) return "It has variants. Delete the variants first.";
  const composite = all.find((x) => x.components.some((c) => c.productId === p.id));
  if (composite) return `It's a component of ${composite.name}.`;
  if (p.stock.some((b) => b.onHand > 0 || b.reserved > 0)) return "It has stock on hand.";
  const c = collections();
  for (const [kind, label] of Object.entries(DOC_LABEL) as [keyof typeof c, string][]) {
    const list = c[kind] as { lines?: { productId: string }[] }[];
    if (list.some((d) => d.lines?.some((l) => l.productId === p.id))) return `It's used on ${label}.`;
  }
  if (movements().some((m) => m.productId === p.id && !m.reference.startsWith("Opening stock"))) return "It has stock transactions.";
  return null;
}

/** Permanently delete items with no history. Throws (and deletes nothing) if any is blocked. */
export async function deleteItems(ids: string[]): Promise<number> {
  await delay();
  const list = products();
  const targets = list.filter((p) => ids.includes(p.id));
  // Deleting a parent together with all its variants is fine: check the rest of the catalogue.
  for (const p of targets) {
    const others = (x: Product) => !ids.includes(x.id);
    if (list.some((x) => others(x) && x.parentId === p.id)) throw new ApiError(`${p.name} can't be deleted: it has variants. Delete the variants first.`);
    const reason = deleteBlocker({ ...p, id: p.id });
    if (reason && !reason.startsWith("It has variants")) throw new ApiError(`${p.name} can't be deleted: ${reason[0].toLowerCase()}${reason.slice(1)}`);
  }
  const set = new Set(targets.map((p) => p.id));
  for (let i = list.length - 1; i >= 0; i--) if (set.has(list[i].id)) list.splice(i, 1);
  const ledger = movements();
  for (let i = ledger.length - 1; i >= 0; i--) if (set.has(ledger[i].productId)) ledger.splice(i, 1);
  return set.size;
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
    if (p.lifecycle !== "active" || !p.trackInventory) continue;
    for (const b of p.stock) {
      if (!whs.includes(b.warehouseId) || b.reorderPoint <= 0) continue;
      const avail = available(b);
      const status = stockStatusOf(avail, b.reorderPoint);
      if (status === "in-stock") continue;
      alerts.push({ productId: p.id, name: p.name, sku: p.sku, icon: p.icon, image: p.image, warehouseId: b.warehouseId, available: avail, reorderPoint: b.reorderPoint, status });
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
      return { productId, name: p.name, sku: p.sku, icon: p.icon, image: p.image, quantity, revenue: quantity * p.sellingPrice };
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
    movementProducts: Object.fromEntries(ranged.slice(0, 6).map((m) => [m.productId, { name: byId.get(m.productId)!.name, icon: byId.get(m.productId)!.icon, image: byId.get(m.productId)!.image }])),
    warehouses,
    topSellers,
  });
}

// ── Global search (header) ───────────────────────────────────────────

export async function searchItems(term: string): Promise<Pick<Product, "id" | "name" | "sku" | "icon" | "image" | "lifecycle">[]> {
  await delay(60);
  const t = term.trim().toLowerCase();
  if (!t) return [];
  return products()
    .filter((p) => [p.name, p.sku, p.barcode].some((v) => v.toLowerCase().includes(t)))
    .slice(0, 6)
    .map(({ id, name, sku, icon, image, lifecycle }) => ({ id, name, sku, icon, image, lifecycle }));
}
