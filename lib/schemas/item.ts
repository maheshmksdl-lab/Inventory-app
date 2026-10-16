import type { DimensionUnit, ItemAttribute, ItemType, Lifecycle, Product, StockStatus, TrackingMode, ValuationMethod, WeightUnit } from "@/lib/types/inventory";

// ── Listing query (kept in the URL) ──────────────────────────────────

export const ITEM_SORTS = ["name", "sku", "category", "onHand", "reserved", "available", "reorderPoint", "cost", "price", "value", "updated"] as const;
export type ItemSort = (typeof ITEM_SORTS)[number];
export const PAGE_SIZES = [10, 25, 50] as const;

export interface ItemQuery {
  q: string;
  category: string;
  brand: string;
  stock: "" | StockStatus;
  type: "" | ItemType;
  /** "" = active and inactive (archived items are hidden unless asked for). */
  lifecycle: "" | Lifecycle;
  sort: ItemSort;
  dir: "asc" | "desc";
  page: number;
  size: (typeof PAGE_SIZES)[number];
}

export const DEFAULT_ITEM_QUERY: ItemQuery = { q: "", category: "", brand: "", stock: "", type: "", lifecycle: "", sort: "name", dir: "asc", page: 1, size: 10 };

const oneOf = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T => (v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback);

export function parseItemQuery(p: URLSearchParams): ItemQuery {
  const size = Number(p.get("size"));
  const page = Number(p.get("page"));
  return {
    q: p.get("q") ?? "",
    category: p.get("category") ?? "",
    brand: p.get("brand") ?? "",
    stock: oneOf(p.get("stock"), ["", "in-stock", "low-stock", "out-of-stock"] as const, ""),
    type: oneOf(p.get("type"), ["", "goods", "service", "composite"] as const, ""),
    lifecycle: oneOf(p.get("status"), ["", "active", "inactive", "archived"] as const, ""),
    sort: oneOf(p.get("sort"), ITEM_SORTS, "name"),
    dir: p.get("dir") === "desc" ? "desc" : "asc",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? (size as ItemQuery["size"]) : 10,
  };
}

/** Only non-default values go in the URL. */
export function itemQueryString(q: ItemQuery): string {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  if (q.category) p.set("category", q.category);
  if (q.brand) p.set("brand", q.brand);
  if (q.stock) p.set("stock", q.stock);
  if (q.type) p.set("type", q.type);
  if (q.lifecycle) p.set("status", q.lifecycle);
  if (q.sort !== "name" || q.dir !== "asc") {
    p.set("sort", q.sort);
    p.set("dir", q.dir);
  }
  if (q.page > 1) p.set("page", String(q.page));
  if (q.size !== 10) p.set("size", String(q.size));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ── Item form ────────────────────────────────────────────────────────

/**
 * Form values are strings while editing; the API takes numbers. Which fields
 * apply depends on the item type, as in Zoho Inventory:
 * - Goods: everything, including variants (attributes) and packed size.
 * - Service: no stock tracking, no packed size, no barcode / MPN / ISBN, not returnable.
 * - Composite: goods fields plus the component items that make up one unit.
 */
export interface ItemFormValues {
  type: ItemType;
  name: string;
  sku: string;
  unit: string;
  category: string;
  brand: string;
  manufacturer: string;
  returnable: boolean;

  length: string;
  width: string;
  height: string;
  dimensionUnit: DimensionUnit;
  weight: string;
  weightUnit: WeightUnit;
  barcode: string;
  mpn: string;
  isbn: string;
  hsnCode: string;

  sellable: boolean;
  sellingPrice: string;
  salesAccount: string;
  description: string;
  purchasable: boolean;
  costPrice: string;
  purchaseAccount: string;
  purchaseDescription: string;
  preferredVendorId: string;
  taxClass: string;

  trackInventory: boolean;
  inventoryAccount: string;
  valuationMethod: ValuationMethod;
  tracking: TrackingMode;
  reorderPoint: string;
  /** New items only: opening quantity per warehouse id, and the unit cost it was bought at. */
  openingStock: Record<string, string>;
  openingRate: string;

  lifecycle: Exclude<Lifecycle, "archived">;
  images: string[];
  components: { productId: string; quantity: string }[];
  /** Variant attributes this item defines (goods that aren't variants themselves). */
  attributes: ItemAttribute[];
  /** Variants only: the value for each of the family's attributes. */
  variantValues: Record<string, string>;
}

const isMoney = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());
const isQty = (v: string) => /^\d+(\.\d{1,3})?$/.test(v.trim());
const isWhole = (v: string) => /^\d+$/.test(v.trim());

/** Context the rules need that isn't in the values themselves. */
export interface ItemRuleContext {
  /** Attribute names a variant must give a value for. */
  variantAttributes?: string[];
}

/** Field errors keyed by field name, or a dotted path for nested rows (components.0.quantity). */
export type ItemFormErrors = Record<string, string>;

export function validateItem(v: ItemFormValues, ctx: ItemRuleContext = {}): ItemFormErrors {
  const e: ItemFormErrors = {};
  const add = (k: string, msg: string) => {
    if (!e[k]) e[k] = msg;
  };
  const service = v.type === "service";

  const name = v.name.trim();
  if (name.length < 2) add("name", "Enter a name (at least 2 characters)");
  else if (name.length > 120) add("name", "Keep the name under 120 characters");

  const sku = v.sku.trim();
  if (sku.length < 2) add("sku", "SKU is required");
  else if (sku.length > 32) add("sku", "Keep the SKU under 32 characters");
  else if (!/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(sku)) add("sku", "Use letters, numbers and hyphens only");

  if (!v.unit) add("unit", "Choose a unit");
  if (!v.category) add("category", "Choose a category");
  if (v.manufacturer.trim().length > 80) add("manufacturer", "Keep the manufacturer under 80 characters");

  // Variant values, and the attributes a parent item defines.
  for (const attr of ctx.variantAttributes ?? []) {
    const val = (v.variantValues[attr] ?? "").trim();
    if (!val) add(`variantValues.${attr}`, `Choose or add a ${attr.toLowerCase()}`);
    else if (val.length > 40) add(`variantValues.${attr}`, "Keep it under 40 characters");
  }
  const attrNames = v.attributes.map((a) => a.name.trim().toLowerCase());
  v.attributes.forEach((a, i) => {
    if (!a.name.trim()) add(`attributes.${i}.name`, "Name the attribute, e.g. Colour");
    else if (attrNames.indexOf(a.name.trim().toLowerCase()) !== i) add(`attributes.${i}.name`, "Attribute names must be different");
    if (a.options.length === 0) add(`attributes.${i}.options`, "Add at least one option");
  });

  // Identifiers and packed size (not for services).
  if (!service) {
    if (v.barcode.trim() && !/^\d{8,14}$/.test(v.barcode.trim())) add("barcode", "UPC / EAN must be 8–14 digits");
    if (v.mpn.trim().length > 40) add("mpn", "Keep the MPN under 40 characters");
    if (v.isbn.trim() && !/^(\d{9}[\dXx]|\d{13})$/.test(v.isbn.replace(/-/g, "").trim())) add("isbn", "ISBN must be 10 or 13 digits");
    const dims = [v.length, v.width, v.height].map((x) => x.trim());
    if (dims.some(Boolean)) {
      if (!dims.every(Boolean)) add("length", "Enter length, width and height, or leave all three empty");
      else if (!dims.every(isQty) || dims.some((x) => Number(x) === 0)) add("length", "Dimensions must be numbers greater than 0");
    }
    if (v.weight.trim() && (!isQty(v.weight) || Number(v.weight) === 0)) add("weight", "Weight must be a number greater than 0");
  }
  if (v.hsnCode.trim()) {
    if (service ? !/^\d{6}$/.test(v.hsnCode.trim()) : !/^\d{4,8}$/.test(v.hsnCode.trim())) add("hsnCode", service ? "SAC code must be 6 digits" : "HSN code must be 4–8 digits");
  }

  // Composite: what one unit is made of.
  if (v.type === "composite") {
    if (v.components.length === 0) add("components", "Add at least one component item");
    const ids = v.components.map((c) => c.productId);
    v.components.forEach((c, i) => {
      if (!c.productId) add(`components.${i}.productId`, "Choose an item");
      else if (ids.indexOf(c.productId) !== i) add(`components.${i}.productId`, "This item is already listed");
      if (!isQty(c.quantity) || Number(c.quantity) <= 0) add(`components.${i}.quantity`, "Enter a quantity above 0");
    });
  }

  // Sales and purchase information: at least one, as in Zoho.
  if (!v.sellable && !v.purchasable) add("sellable", "Turn on sales or purchase information (or both)");
  if (v.sellable) {
    if (!v.sellingPrice.trim()) add("sellingPrice", "Selling price is required");
    else if (!isMoney(v.sellingPrice)) add("sellingPrice", "Use a number with up to 2 decimals");
    if (!v.salesAccount) add("salesAccount", "Choose a sales account");
  }
  if (v.description.trim().length > 600) add("description", "Keep the description under 600 characters");
  if (v.purchasable) {
    if (!v.costPrice.trim()) add("costPrice", "Cost price is required");
    else if (!isMoney(v.costPrice)) add("costPrice", "Use a number with up to 2 decimals");
    if (!v.purchaseAccount) add("purchaseAccount", "Choose a purchase account");
  }
  if (v.purchaseDescription.trim().length > 600) add("purchaseDescription", "Keep the description under 600 characters");
  if (!v.taxClass) add("taxClass", "Choose a tax rate");

  // Inventory tracking (never for services).
  if (v.trackInventory && !service) {
    if (!v.inventoryAccount) add("inventoryAccount", "Choose an inventory account");
    if (!isWhole(v.reorderPoint)) add("reorderPoint", "Reorder point must be a whole number (0 or more)");
    for (const [wh, qty] of Object.entries(v.openingStock)) if (qty.trim() && !isWhole(qty)) add(`openingStock.${wh}`, "Use a whole number");
    const anyOpening = Object.values(v.openingStock).some((q) => Number(q) > 0);
    if (v.openingRate.trim() && !isMoney(v.openingRate)) add("openingRate", "Use a number with up to 2 decimals");
    else if (anyOpening && !v.openingRate.trim() && !v.purchasable) add("openingRate", "Enter the opening stock rate");
  }
  return e;
}

export interface ItemInput {
  type: ItemType;
  name: string;
  sku: string;
  unit: string;
  category: string;
  brand: string;
  manufacturer: string;
  returnable: boolean;
  dimensions: Product["dimensions"];
  weight: Product["weight"];
  barcode: string;
  mpn: string;
  isbn: string;
  hsnCode: string;
  sellable: boolean;
  sellingPrice: number;
  salesAccount: string;
  description: string;
  purchasable: boolean;
  costPrice: number;
  purchaseAccount: string;
  purchaseDescription: string;
  preferredVendorId: string;
  taxClass: string;
  trackInventory: boolean;
  inventoryAccount: string;
  valuationMethod: ValuationMethod;
  tracking: TrackingMode;
  reorderPoint: number;
  lifecycle: Exclude<Lifecycle, "archived">;
  images: string[];
  components: Product["components"];
  attributes: ItemAttribute[];
  variantValues: Record<string, string>;
}

/** Create-only extras: opening stock per warehouse and the variant's parent. */
export interface ItemCreateExtras {
  openingStock: Record<string, number>;
  openingRate: number;
  parentId: string | null;
}

export function toItemInput(v: ItemFormValues): ItemInput {
  const service = v.type === "service";
  const hasDims = !service && [v.length, v.width, v.height].every((x) => x.trim());
  const tracked = v.trackInventory && !service;
  return {
    type: v.type,
    name: v.name.trim(),
    sku: v.sku.trim().toUpperCase(),
    unit: v.unit,
    category: v.category,
    brand: v.brand,
    manufacturer: v.manufacturer.trim(),
    returnable: !service && v.returnable,
    dimensions: hasDims ? { length: Number(v.length), width: Number(v.width), height: Number(v.height), unit: v.dimensionUnit } : null,
    weight: !service && v.weight.trim() ? { value: Number(v.weight), unit: v.weightUnit } : null,
    barcode: service ? "" : v.barcode.trim(),
    mpn: service ? "" : v.mpn.trim(),
    isbn: service ? "" : v.isbn.replace(/-/g, "").trim().toUpperCase(),
    hsnCode: v.hsnCode.trim(),
    sellable: v.sellable,
    sellingPrice: v.sellable ? Number(v.sellingPrice) : 0,
    salesAccount: v.sellable ? v.salesAccount : "",
    description: v.description.trim(),
    purchasable: v.purchasable,
    // Items you don't buy are still valued: at the opening stock rate when there is one.
    costPrice: v.purchasable ? Number(v.costPrice) : Number(v.openingRate) || 0,
    purchaseAccount: v.purchasable ? v.purchaseAccount : "",
    purchaseDescription: v.purchasable ? v.purchaseDescription.trim() : "",
    preferredVendorId: v.purchasable ? v.preferredVendorId : "",
    taxClass: v.taxClass,
    trackInventory: tracked,
    inventoryAccount: tracked ? v.inventoryAccount : "",
    valuationMethod: v.valuationMethod,
    tracking: tracked ? v.tracking : "none",
    reorderPoint: tracked ? Number(v.reorderPoint) : 0,
    lifecycle: v.lifecycle,
    images: v.images,
    components: v.type === "composite" ? v.components.map((c) => ({ productId: c.productId, quantity: Number(c.quantity) })) : [],
    attributes: v.type === "goods" ? v.attributes.map((a) => ({ name: a.name.trim(), options: a.options })) : [],
    variantValues: Object.fromEntries(Object.entries(v.variantValues).map(([k, val]) => [k, val.trim()])),
  };
}

export function toCreateExtras(v: ItemFormValues, parentId: string | null): ItemCreateExtras {
  const tracked = v.trackInventory && v.type !== "service";
  return {
    openingStock: tracked ? Object.fromEntries(Object.entries(v.openingStock).map(([wh, q]) => [wh, Number(q) || 0])) : {},
    openingRate: Number(v.openingRate) || (v.purchasable ? Number(v.costPrice) : 0),
    parentId,
  };
}
