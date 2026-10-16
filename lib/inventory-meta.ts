/**
 * Labels, tones and stock rules shared by every screen. Status tones are
 * semantic (green / amber / red / grey) and always ship with a text label.
 */
import type {
  DisplayStatus,
  ItemType,
  Lifecycle,
  MovementType,
  Product,
  ProductRow,
  PurchaseOrderStatus,
  SalesOrderStatus,
  StockBalance,
  StockStatus,
  TrackingMode,
  ValuationMethod,
  WarehouseScope,
} from "@/lib/types/inventory";

export interface Tone {
  label: string;
  fg: string;
  bg: string;
  dot: boolean;
}

export const tone = (label: string, fg: string, bg: string, dot = true): Tone => ({ label, fg, bg, dot });

export const STATUS_META: Record<DisplayStatus, Tone> = {
  "in-stock": tone("In Stock", "var(--success)", "var(--success-bg)"),
  "low-stock": tone("Low Stock", "var(--warning)", "var(--warning-bg)"),
  "out-of-stock": tone("Out of Stock", "var(--danger)", "var(--danger-bg)"),
  untracked: tone("Not Tracked", "var(--info)", "var(--info-bg)"),
  inactive: tone("Inactive", "var(--neutral-fg)", "var(--neutral-bg)"),
  archived: tone("Archived", "var(--neutral-fg)", "var(--neutral-bg)"),
};

export const MOVEMENT_META: Record<MovementType, Tone> = {
  received: tone("Stock Received", "var(--success)", "var(--success-bg)", false),
  issued: tone("Stock Issued", "var(--danger)", "var(--danger-bg)", false),
  transfer: tone("Stock Transfer", "var(--info)", "var(--info-bg)", false),
  adjustment: tone("Stock Adjustment", "var(--warning)", "var(--warning-bg)", false),
};

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  goods: "Goods",
  service: "Service",
  composite: "Composite item",
};

/** What each item type is for, shown on the type picker. */
export const ITEM_TYPE_HINT: Record<ItemType, string> = {
  goods: "Physical products you buy, stock and sell.",
  service: "Work you sell or buy. No stock is kept.",
  composite: "A kit or bundle assembled from other items.",
};

export const VALUATION_LABEL: Record<ValuationMethod, string> = {
  fifo: "FIFO (First In, First Out)",
  "weighted-average": "Weighted Average Cost",
};

export const TRACKING_LABEL: Record<TrackingMode, string> = {
  none: "None",
  serial: "Serial numbers",
  batch: "Batches",
};

export const LIFECYCLE_LABEL: Record<Lifecycle, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

/** Order statuses, with a small neutral-or-semantic dot colour for the dashboard summary. */
export const PO_STATUSES: { value: PurchaseOrderStatus; label: string; dot: string }[] = [
  { value: "draft", label: "Draft", dot: "#98A2B3" },
  { value: "pending-approval", label: "Pending Approval", dot: "#F79009" },
  { value: "confirmed", label: "Confirmed", dot: "#2E90FA" },
  { value: "partially-received", label: "Partially Received", dot: "#7A5AF8" },
  { value: "completed", label: "Completed", dot: "#17B26A" },
  { value: "cancelled", label: "Cancelled", dot: "#F04438" },
];

export const SO_STATUSES: { value: SalesOrderStatus; label: string; dot: string }[] = [
  { value: "draft", label: "Draft", dot: "#98A2B3" },
  { value: "confirmed", label: "Confirmed", dot: "#2E90FA" },
  { value: "partially-fulfilled", label: "Partially Fulfilled", dot: "#7A5AF8" },
  { value: "fulfilled", label: "Fulfilled", dot: "#17B26A" },
  { value: "cancelled", label: "Cancelled", dot: "#F04438" },
];

/** Purchase orders still waiting on approval or goods: counted as "pending". */
export const PENDING_PO: PurchaseOrderStatus[] = ["pending-approval", "confirmed", "partially-received"];
/** Sales orders confirmed but not yet fully shipped: counted as "open". */
export const OPEN_SO: SalesOrderStatus[] = ["confirmed", "partially-fulfilled"];

// ── Stock rules ──────────────────────────────────────────────────────

export const available = (b: Pick<StockBalance, "onHand" | "reserved">) => b.onHand - b.reserved;

export function stockStatusOf(availableQty: number, reorderPoint: number): StockStatus {
  if (availableQty <= 0) return "out-of-stock";
  if (availableQty <= reorderPoint) return "low-stock";
  return "in-stock";
}

/**
 * A product's totals for a scope: one warehouse, or all of them against the
 * item-level reorder point. Untracked items (services) are never low or out of
 * stock: their stock status stays "in-stock" and they display as Not Tracked.
 */
export function toRow(p: Product, scope: WarehouseScope): ProductRow {
  const balances = scope === "all" ? p.stock : p.stock.filter((b) => b.warehouseId === scope);
  const onHand = balances.reduce((s, b) => s + b.onHand, 0);
  const reserved = balances.reduce((s, b) => s + b.reserved, 0);
  const avail = onHand - reserved;
  const scopeReorderPoint = scope === "all" ? p.reorderPoint : (balances[0]?.reorderPoint ?? 0);
  const stockStatus = p.trackInventory ? stockStatusOf(avail, scopeReorderPoint) : "in-stock";
  const status: DisplayStatus = p.lifecycle !== "active" ? p.lifecycle : p.trackInventory ? stockStatus : "untracked";
  return { ...p, onHand, reserved, available: avail, scopeReorderPoint, stockValue: onHand * p.costPrice, stockStatus, status };
}
