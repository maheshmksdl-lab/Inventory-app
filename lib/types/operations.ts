/**
 * Types for the purchasing, sales, warehouse and admin modules. Every record
 * here is demo data held in the browser tab; nothing is posted to a ledger.
 */
import type { PurchaseOrderStatus, SalesOrderStatus } from "./inventory";

export type RecordStatus = "active" | "archived";

export interface DocActivity {
  at: string; // ISO datetime
  text: string;
  user: string;
}

// ── Catalogue ────────────────────────────────────────────────────────

/** A category or a brand. Products refer to it by name. */
export interface CatalogEntry {
  id: string;
  name: string;
  description: string;
  status: RecordStatus;
  createdAt: string;
}

// ── Warehouses ───────────────────────────────────────────────────────

export interface StorageZone {
  code: string;
  name: string;
  kind: "Racking" | "Shelving" | "Bulk floor" | "Secure cage" | "Staging";
  bins: number;
  /** Share of bin capacity in use, 0–100 (illustrative). */
  utilisation: number;
}

export interface WarehouseRecord {
  /** Seeded warehouses keep their stock ids (wh-main…); new ones get a generated id and hold no stock. */
  id: string;
  name: string;
  short: string;
  code: string;
  address: string;
  city: string;
  contactName: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  zones: StorageZone[];
  createdAt: string;
}

// ── Partners ─────────────────────────────────────────────────────────

export interface VendorRecord {
  id: string;
  code: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  gstin: string;
  paymentTerms: string;
  status: RecordStatus;
  createdAt: string;
}

export interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  billingAddress: string;
  shippingAddress: string;
  status: RecordStatus;
  createdAt: string;
}

// ── Documents ────────────────────────────────────────────────────────

/** One priced line on a purchase or sales order. Discount is a percentage. */
export interface OrderLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  vendorId: string;
  warehouseId: string;
  orderDate: string; // ISO date
  expectedDate: string;
  status: PurchaseOrderStatus;
  lines: (OrderLine & { received: number })[];
  notes: string;
  createdBy: string;
  activity: DocActivity[];
}

export type ReceiptStatus = "draft" | "received" | "partial" | "cancelled";

export interface ReceiptLine {
  productId: string;
  /** Still outstanding on the PO line when the receipt was made. */
  expected: number;
  received: number;
  rejected: number;
  rejectReason: string;
}

export interface GoodsReceipt {
  id: string;
  number: string;
  poId: string;
  vendorId: string;
  warehouseId: string;
  receivedDate: string;
  status: ReceiptStatus;
  lines: ReceiptLine[];
  notes: string;
  createdBy: string;
}

export type BillStatus = "draft" | "awaiting-review" | "due" | "overdue" | "paid";

export interface SupplierBill {
  id: string;
  number: string;
  vendorBillNo: string;
  vendorId: string;
  poId: string;
  billDate: string;
  dueDate: string;
  amount: number;
  status: BillStatus;
  notes: string;
}

export interface SalesOrder {
  id: string;
  number: string;
  customerId: string;
  warehouseId: string;
  orderDate: string;
  deliveryDate: string;
  status: SalesOrderStatus;
  lines: (OrderLine & { fulfilled: number })[];
  notes: string;
  createdBy: string;
  activity: DocActivity[];
}

export type FulfilmentStage = "to-pick" | "picking" | "packed" | "dispatched";

export interface Fulfilment {
  id: string;
  soId: string;
  stage: FulfilmentStage;
  lines: { productId: string; ordered: number; picked: number; packed: number }[];
  carrier: string;
  tracking: string;
  packages: number;
  weightKg: number;
  /** True for seeded history; false for dispatches marked in this session (simulated). */
  historical: boolean;
  updatedAt: string;
  activity: DocActivity[];
}

export type ReturnStatus = "requested" | "received" | "inspected" | "closed" | "rejected";
export type ReturnOutcome = "" | "restock" | "quarantine" | "write-off";

export interface SalesReturn {
  id: string;
  number: string;
  soId: string;
  customerId: string;
  warehouseId: string;
  requestedDate: string;
  status: ReturnStatus;
  lines: { productId: string; quantity: number; reason: string; outcome: ReturnOutcome }[];
  notes: string;
  createdBy: string;
}

export type TransferStatus = "draft" | "submitted" | "approved" | "in-transit" | "received" | "cancelled";

export interface StockTransfer {
  id: string;
  number: string;
  from: string;
  to: string;
  createdDate: string;
  expectedDate: string;
  status: TransferStatus;
  lines: { productId: string; quantity: number }[];
  notes: string;
  createdBy: string;
  activity: DocActivity[];
}

export type AdjustmentReason = "damaged" | "missing" | "expired" | "found" | "count-correction" | "other";

export interface StockAdjustment {
  id: string;
  number: string;
  productId: string;
  warehouseId: string;
  /** Signed: negative removes stock, positive adds it. */
  quantity: number;
  reason: AdjustmentReason;
  notes: string;
  createdBy: string;
  createdAt: string; // ISO datetime
  /** "posted" exists only in the seeded history; new adjustments stay drafts. */
  status: "draft" | "posted";
}

export type StocktakeStatus = "scheduled" | "in-progress" | "in-review" | "completed" | "cancelled";

export interface Stocktake {
  id: string;
  number: string;
  warehouseId: string;
  countDate: string;
  assignee: string;
  /** "" = every product, otherwise one category. */
  category: string;
  status: StocktakeStatus;
  lines: { productId: string; expected: number; counted: number | null }[];
  notes: string;
}

// ── Administration ───────────────────────────────────────────────────

export type RoleId = "administrator" | "inventory-manager" | "purchasing-manager" | "sales-staff" | "warehouse-staff" | "viewer";

export interface AppUser {
  id: string;
  name: string;
  /** Short display name used on stock records ("Sarah M."). */
  short: string;
  email: string;
  role: RoleId;
  team: string;
  status: "active" | "invited" | "suspended";
  lastActive: string | null;
}

export interface AppSettings {
  orgName: string;
  legalName: string;
  gstin: string;
  email: string;
  phone: string;
  address: string;
  defaultWarehouse: string;
  costingMethod: "fifo" | "weighted-average" | "standard";
  allowNegativeStock: boolean;
  reorderSuggestion: "to-reorder-point" | "double-reorder-point";
  units: string[];
  numbering: Record<"po" | "so" | "grn" | "trf" | "adj" | "bill" | "rma" | "stk", string>;
  skuPattern: string;
  currency: string;
  locale: string;
  dateFormat: "MMM D, YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  notifications: Record<"lowStock" | "poApproval" | "receipts" | "transfers" | "dailyDigest", boolean>;
  preferences: { landing: string; density: "comfortable" | "compact"; rowsPerPage: number };
  integrations: Record<string, boolean>;
}
