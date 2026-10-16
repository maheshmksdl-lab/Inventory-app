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

/**
 * Item kinds, as in Zoho Inventory: physical goods, services (sold or bought
 * but never stocked) and composite items assembled from other items.
 */
export type ItemType = "goods" | "service" | "composite";
export type Lifecycle = "active" | "inactive" | "archived";
export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";
/** What a listing shows: stock state for active tracked items, otherwise the lifecycle. */
export type DisplayStatus = StockStatus | "untracked" | "inactive" | "archived";

export type ValuationMethod = "fifo" | "weighted-average";
/** Advanced tracking: none, a serial number per unit, or batch / lot numbers. */
export type TrackingMode = "none" | "serial" | "batch";
export type DimensionUnit = "cm" | "in";
export type WeightUnit = "kg" | "g" | "lb" | "oz";

export interface ItemDimensions {
  length: number;
  width: number;
  height: number;
  unit: DimensionUnit;
}

export interface ItemWeight {
  value: number;
  unit: WeightUnit;
}

/** A variant attribute defined on a parent item, e.g. Colour: Black, Grey. */
export interface ItemAttribute {
  name: string;
  options: string[];
}

/** One item (and how many of it) inside a composite item. */
export interface CompositeComponent {
  productId: string;
  quantity: number;
}

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

export type ActivityKind = "created" | "updated" | "price" | "archived" | "restored" | "status" | "images" | "variant";

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
  /** UPC / EAN barcode. */
  barcode: string;
  /** Manufacturer part number. */
  mpn: string;
  isbn: string;
  /** HSN code for goods, SAC code for services (GST). */
  hsnCode: string;
  /** Sales description: what customers see on sales documents. */
  description: string;
  category: string;
  /** Optional, as in Zoho; "" when not set. */
  brand: string;
  manufacturer: string;
  type: ItemType;
  unit: string;
  returnable: boolean;
  /** Packed size and weight, for shipping (goods and composite items). */
  dimensions: ItemDimensions | null;
  weight: ItemWeight | null;

  sellable: boolean;
  sellingPrice: number;
  salesAccount: string;
  purchasable: boolean;
  costPrice: number;
  purchaseAccount: string;
  purchaseDescription: string;
  preferredVendorId: string;
  taxClass: string;

  /** Services are never tracked. Fixed once the item is created. */
  trackInventory: boolean;
  inventoryAccount: string;
  valuationMethod: ValuationMethod;
  tracking: TrackingMode;
  /** Item-level reorder point, compared with total available stock. */
  reorderPoint: number;

  lifecycle: Lifecycle;
  icon: ProductIconKey;
  /** Photos, primary first: /public paths or uploaded data URLs. Up to 15. */
  images: string[];
  /** The primary photo (images[0]); items without one show their category glyph. */
  image?: string;
  /** Composite items: what one unit is made of. Empty for other types. */
  components: CompositeComponent[];
  /** Variant attributes this item defines for its family (goods only). */
  attributes: ItemAttribute[];
  /** A variant points at the item it was added from; null for everything else. */
  parentId: string | null;
  /** This item's value for each family attribute, e.g. { Colour: "Grey" }. */
  variantValues: Record<string, string>;
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
  image?: string;
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
  image?: string;
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
  /** Name, icon and photo of each product in recentMovements. */
  movementProducts: Record<string, { name: string; icon: ProductIconKey; image?: string }>;
  warehouses: WarehouseSummary[];
  topSellers: TopSeller[];
}
