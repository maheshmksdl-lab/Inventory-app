import { z } from "zod";
import type { ItemType, Lifecycle, StockStatus } from "@/lib/types/inventory";

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
    type: oneOf(p.get("type"), ["", "stocked", "consumable", "bundle"] as const, ""),
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

const money = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), `${label} must be a number with up to 2 decimals`);

export const itemFormSchema = z
  .object({
    name: z.string().trim().min(2, "Enter a product name (at least 2 characters)").max(120, "Keep the name under 120 characters"),
    sku: z
      .string()
      .trim()
      .min(2, "SKU is required")
      .max(32, "Keep the SKU under 32 characters")
      .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, "Use letters, numbers and hyphens only"),
    description: z.string().trim().max(600, "Keep the description under 600 characters"),
    category: z.string().min(1, "Choose a category"),
    brand: z.string().min(1, "Choose a brand"),
    type: z.enum(["stocked", "consumable", "bundle"]),
    barcode: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d{8,14}$/.test(v), "Barcode must be 8–14 digits"),
    unit: z.string().min(1, "Choose a unit"),
    taxClass: z.string().min(1, "Choose a tax class"),
    costPrice: money("Cost price"),
    sellingPrice: money("Selling price"),
    reorderPoint: z
      .string()
      .trim()
      .min(1, "Reorder point is required")
      .refine((v) => /^\d+$/.test(v), "Reorder point must be a whole number (0 or more)"),
    lifecycle: z.enum(["active", "inactive"]),
  });

/** Form values are strings while editing; the API takes numbers. */
export type ItemFormValues = z.input<typeof itemFormSchema>;

export interface ItemInput {
  name: string;
  sku: string;
  description: string;
  category: string;
  brand: string;
  type: ItemType;
  barcode: string;
  unit: string;
  taxClass: string;
  costPrice: number;
  sellingPrice: number;
  reorderPoint: number;
  lifecycle: Exclude<Lifecycle, "archived">;
}

export function toItemInput(v: ItemFormValues): ItemInput {
  return {
    ...v,
    name: v.name.trim(),
    sku: v.sku.trim().toUpperCase(),
    description: v.description.trim(),
    barcode: v.barcode.trim(),
    costPrice: Number(v.costPrice),
    sellingPrice: Number(v.sellingPrice),
    reorderPoint: Number(v.reorderPoint),
  };
}
