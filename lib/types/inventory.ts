/** Inventory domain types. The mock API returns these; a real backend should too. */

export type WarehouseId = "wh-main" | "wh-branch" | "wh-remote";
/** "all" is every warehouse together. */
export type WarehouseScope = WarehouseId | "all";

export interface Warehouse {
  id: WarehouseId;
  name: string;
  short: string;
  city: string;
}

export type ItemType = "stocked" | "consumable" | "bundle";
export type Lifecycle = "active" | "inactive" | "archived";
export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";
/** What a listing shows: stock state for active items, otherwise the lifecycle. */
export type DisplayStatus = StockStatus | "inactive" | "archived";

export type ProductIconKey =
  | "headphones"
  | "keyboard"
  | "mouse"
  | "monitor"
  | "printer"
  | "usb"
  | "chair"
  | "network"
  | "storage"
  | "webcam"
  | "speaker"
  | "power"
  | "laptop"
  | "lamp"
  | "desk"
  | "box";

/** Stock of one product at one warehouse. Available is always onHand − reserved. */
export interface StockBalance {
  warehouseId: WarehouseId;
  onHand: number;
  reserved: number;
  reorderPoint: number;
}

export interface ProductSupplier {
  vendorId: string;
  supplierSku: string;
  lastCost: number;
  preferred: boolean;
}

export type ActivityKind = "created" | "updated" | "price" | "archived" | "restored" | "status";

export interface ProductActivity {
  id: string;
  kind: ActivityKind;
  text: string;
  user: string;
  at: string; // ISO datetime
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  description: string;
  category: string;
  brand: string;
  type: ItemType;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  taxClass: string;
  /** Item-level reorder point, compared with total available stock. */
  reorderPoint: number;
  lifecycle: Lifecycle;
  icon: ProductIconKey;
  stock: StockBalance[];
  suppliers: ProductSupplier[];
  activity: ProductActivity[];
  createdAt: string;
  updatedAt: string;
}

/** Product totals for one scope (a warehouse or all), as lists and cards show them. */
export interface ProductRow extends Product {
  onHand: number;
  reserved: number;
  available: number;
  scopeReorderPoint: number;
  stockValue: number;
  stockStatus: StockStatus;
  status: DisplayStatus;
}

export type MovementType = "received" | "issued" | "transfer" | "adjustment";

export interface StockMovement {
  id: string;
  at: string; // ISO datetime
  productId: string;
  type: MovementType;
  /** Signed for received / issued / adjustment; units moved for transfers. */
  quantity: number;
  from: WarehouseId | null;
  to: WarehouseId | null;
  reference: string;
  user: string;
}

export interface Vendor {
  id: string;
  name: string;
}

export type PurchaseOrderStatus = "draft" | "pending-approval" | "confirmed" | "partially-received" | "completed" | "cancelled";
export type SalesOrderStatus = "draft" | "confirmed" | "partially-fulfilled" | "fulfilled" | "cancelled";

// ── Dashboard ────────────────────────────────────────────────────────

export interface LowStockAlert {
  productId: string;
  name: string;
  sku: string;
  icon: ProductIconKey;
  warehouseId: WarehouseId;
  available: number;
  reorderPoint: number;
  status: Exclude<StockStatus, "in-stock">;
}

export interface TrendPoint {
  /** ISO date of the day (or the first day of the week). */
  date: string;
  received: number;
  issued: number;
}

export interface WarehouseSummary {
  warehouseId: WarehouseId;
  skus: number;
  quantity: number;
  value: number;
  lowStock: number;
}

export interface TopSeller {
  productId: string;
  name: string;
  sku: string;
  icon: ProductIconKey;
  quantity: number;
  revenue: number;
}

export interface DashboardData {
  range: { start: string; end: string; days: number };
  kpis: {
    totalProducts: number;
    activeProducts: number;
    stockOnHand: number;
    reserved: number;
    inventoryValue: number;
    lowStock: number;
    lowStockLocations: number;
    outOfStock: number;
    pendingPurchaseOrders: number;
    openSalesOrders: number;
    movements: number;
  };
  trend: TrendPoint[];
  lowStock: LowStockAlert[];
  lowStockTotal: number;
  purchaseOrders: Record<PurchaseOrderStatus, number>;
  salesOrders: Record<SalesOrderStatus, number>;
  recentMovements: StockMovement[];
  /** Name and icon of each product in recentMovements. */
  movementProducts: Record<string, { name: string; icon: ProductIconKey }>;
  warehouses: WarehouseSummary[];
  topSellers: TopSeller[];
}
