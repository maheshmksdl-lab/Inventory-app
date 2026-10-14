/**
 * Report definitions. Each report turns the shared demo data into plain rows
 * with declared columns, so the report page can filter, sort, total, export
 * and print them the same way. Every formula is stated in `method`.
 */
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsLeftRightIcon,
  ClockCountdownIcon,
  CoinsIcon,
  ProhibitIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
  StackIcon,
  WarehouseIcon,
  WarningIcon,
} from "@phosphor-icons/react/dist/ssr";
import { reorderAlerts, warehouseStats } from "@/lib/derive";
import { docTotals } from "@/lib/doc-math";
import { addDays } from "@/lib/format";
import { STATUS_META, stockStatusOf } from "@/lib/inventory-meta";
import { ADJUSTMENT_REASON, PO_STATUS, SO_STATUS } from "@/lib/operations-meta";
import type { ProductRow, StockMovement } from "@/lib/types/inventory";
import type { AppSettings, CustomerRecord, PurchaseOrder, SalesOrder, StockAdjustment, VendorRecord, WarehouseRecord } from "@/lib/types/operations";

export type CellFormat = "text" | "mono" | "number" | "signed" | "currency" | "date" | "percent";

export interface ReportColumn {
  key: string;
  label: string;
  format?: CellFormat;
  /** Summed in the totals row. */
  total?: boolean;
}

export type ReportRow = Record<string, string | number> & { _id: string; _search: string };

export interface ReportData {
  products: ProductRow[];
  movements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  adjustments: StockAdjustment[];
  vendors: VendorRecord[];
  customers: CustomerRecord[];
  warehouses: WarehouseRecord[];
  settings: AppSettings;
}

export interface ReportFilters {
  from: string;
  to: string;
  warehouse: string;
}

export interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  group: "Stock" | "Value" | "Orders";
  /** Uses the date range (otherwise it's a snapshot of current stock). */
  dated: boolean;
  method: string;
  columns: ReportColumn[];
  defaultSort: { key: string; dir: "asc" | "desc" };
  build: (d: ReportData, f: ReportFilters) => ReportRow[];
}

const whName = (d: ReportData, id: string | null) => d.warehouses.find((w) => w.id === id)?.name ?? "—";
const live = (d: ReportData) => d.products.filter((p) => p.lifecycle !== "archived");
const inRange = (date: string, f: ReportFilters) => (!f.from || date.slice(0, 10) >= f.from) && (!f.to || date.slice(0, 10) <= f.to);
const touches = (m: StockMovement, w: string) => !w || m.from === w || m.to === w;
const balances = (p: ProductRow, w: string) => (w ? p.stock.filter((b) => b.warehouseId === w) : p.stock);
const sum = <T,>(list: T[], f: (x: T) => number) => list.reduce((s, x) => s + f(x), 0);

export const REPORTS: ReportDef[] = [
  {
    id: "stock-summary",
    title: "Stock Summary",
    description: "On hand, reserved and available stock for every product.",
    icon: StackIcon,
    group: "Stock",
    dated: false,
    method: "Current demo balances. Available = on hand − reserved. Status compares available with the reorder point (item level for all warehouses, warehouse level for one).",
    columns: [
      { key: "sku", label: "SKU", format: "mono" },
      { key: "name", label: "Product" },
      { key: "category", label: "Category" },
      { key: "onHand", label: "On hand", format: "number", total: true },
      { key: "reserved", label: "Reserved", format: "number", total: true },
      { key: "available", label: "Available", format: "number", total: true },
      { key: "reorderPoint", label: "Reorder point", format: "number" },
      { key: "status", label: "Status" },
    ],
    defaultSort: { key: "name", dir: "asc" },
    build: (d, f) =>
      live(d).map((p) => {
        const bs = balances(p, f.warehouse);
        const onHand = sum(bs, (b) => b.onHand);
        const reserved = sum(bs, (b) => b.reserved);
        const rp = f.warehouse ? (bs[0]?.reorderPoint ?? 0) : p.reorderPoint;
        const status = p.lifecycle === "active" ? STATUS_META[stockStatusOf(onHand - reserved, rp)].label : "Inactive";
        return { _id: p.id, _search: `${p.name} ${p.sku} ${p.category}`, sku: p.sku, name: p.name, category: p.category, onHand, reserved, available: onHand - reserved, reorderPoint: rp, status };
      }),
  },
  {
    id: "stock-movement",
    title: "Stock Movement",
    description: "Units received, issued, transferred and adjusted per product over a period.",
    icon: ArrowsLeftRightIcon,
    group: "Stock",
    dated: true,
    method: "Sums the movement ledger in the date range. With a warehouse selected, transfers count as in (to it) or out (from it); for all warehouses they net to zero. Net = received − issued + transfers in − transfers out + adjustments.",
    columns: [
      { key: "sku", label: "SKU", format: "mono" },
      { key: "name", label: "Product" },
      { key: "received", label: "Received", format: "number", total: true },
      { key: "issued", label: "Issued", format: "number", total: true },
      { key: "transferIn", label: "Transfers in", format: "number", total: true },
      { key: "transferOut", label: "Transfers out", format: "number", total: true },
      { key: "adjusted", label: "Adjustments", format: "signed", total: true },
      { key: "net", label: "Net change", format: "signed", total: true },
    ],
    defaultSort: { key: "issued", dir: "desc" },
    build: (d, f) => {
      const ms = d.movements.filter((m) => inRange(m.at, f) && touches(m, f.warehouse));
      return live(d)
        .map((p) => {
          const mine = ms.filter((m) => m.productId === p.id);
          const received = sum(mine.filter((m) => m.type === "received"), (m) => m.quantity);
          const issued = sum(mine.filter((m) => m.type === "issued"), (m) => -m.quantity);
          const transferIn = f.warehouse ? sum(mine.filter((m) => m.type === "transfer" && m.to === f.warehouse), (m) => m.quantity) : 0;
          const transferOut = f.warehouse ? sum(mine.filter((m) => m.type === "transfer" && m.from === f.warehouse), (m) => m.quantity) : 0;
          const adjusted = sum(mine.filter((m) => m.type === "adjustment"), (m) => m.quantity);
          return { _id: p.id, _search: `${p.name} ${p.sku}`, sku: p.sku, name: p.name, received, issued, transferIn, transferOut, adjusted, net: received - issued + transferIn - transferOut + adjusted, _count: mine.length };
        })
        .filter((r) => r._count > 0);
    },
  },
  {
    id: "inventory-valuation",
    title: "Inventory Valuation",
    description: "Stock value per product at item cost price.",
    icon: CoinsIcon,
    group: "Value",
    dated: false,
    method: "Value = on hand × item cost price (standard demo cost). Illustrative only — see Inventory Valuation for other cost bases.",
    columns: [
      { key: "sku", label: "SKU", format: "mono" },
      { key: "name", label: "Product" },
      { key: "category", label: "Category" },
      { key: "onHand", label: "On hand", format: "number", total: true },
      { key: "unitCost", label: "Unit cost", format: "currency" },
      { key: "value", label: "Value", format: "currency", total: true },
    ],
    defaultSort: { key: "value", dir: "desc" },
    build: (d, f) =>
      live(d)
        .map((p) => {
          const onHand = sum(balances(p, f.warehouse), (b) => b.onHand);
          return { _id: p.id, _search: `${p.name} ${p.sku} ${p.category}`, sku: p.sku, name: p.name, category: p.category, onHand, unitCost: p.costPrice, value: onHand * p.costPrice };
        })
        .filter((r) => r.onHand > 0),
  },
  {
    id: "low-stock",
    title: "Low Stock",
    description: "Warehouse locations at or below their reorder point (still in stock).",
    icon: WarningIcon,
    group: "Stock",
    dated: false,
    method: "Active products where 0 < available ≤ warehouse reorder point. Suggested = target − available − on order (target per Settings).",
    columns: [
      { key: "sku", label: "SKU", format: "mono" },
      { key: "name", label: "Product" },
      { key: "warehouse", label: "Warehouse" },
      { key: "available", label: "Available", format: "number", total: true },
      { key: "reorderPoint", label: "Reorder point", format: "number" },
      { key: "incoming", label: "On order", format: "number", total: true },
      { key: "suggested", label: "Suggested qty", format: "number", total: true },
    ],
    defaultSort: { key: "available", dir: "asc" },
    build: (d, f) =>
      reorderAlerts(d.products, d.purchaseOrders, d.settings.reorderSuggestion)
        .filter((a) => a.status === "low-stock" && (!f.warehouse || a.warehouseId === f.warehouse))
        .map((a) => ({ _id: a.key, _search: `${a.product.name} ${a.product.sku}`, sku: a.product.sku, name: a.product.name, warehouse: whName(d, a.warehouseId), available: a.available, reorderPoint: a.reorderPoint, incoming: a.incoming, suggested: a.suggested })),
  },
  {
    id: "out-of-stock",
    title: "Out of Stock",
    description: "Locations with nothing available to sell or move.",
    icon: ProhibitIcon,
    group: "Stock",
    dated: false,
    method: "Active products with available ≤ 0 at a warehouse that has a reorder point. On hand may be above zero if all of it is reserved.",
    columns: [
      { key: "sku", label: "SKU", format: "mono" },
      { key: "name", label: "Product" },
      { key: "warehouse", label: "Warehouse" },
      { key: "onHand", label: "On hand", format: "number", total: true },
      { key: "reorderPoint", label: "Reorder point", format: "number" },
      { key: "incoming", label: "On order", format: "number", total: true },
      { key: "suggested", label: "Suggested qty", format: "number", total: true },
    ],
    defaultSort: { key: "name", dir: "asc" },
    build: (d, f) =>
      reorderAlerts(d.products, d.purchaseOrders, d.settings.reorderSuggestion)
        .filter((a) => a.status === "out-of-stock" && (!f.warehouse || a.warehouseId === f.warehouse))
        .map((a) => ({ _id: a.key, _search: `${a.product.name} ${a.product.sku}`, sku: a.product.sku, name: a.product.name, warehouse: whName(d, a.warehouseId), onHand: a.onHand, reorderPoint: a.reorderPoint, incoming: a.incoming, suggested: a.suggested })),
  },
  {
    id: "purchase-orders",
    title: "Purchase Orders",
    description: "Orders placed in a period, their value and how much has arrived.",
    icon: ShoppingCartIcon,
    group: "Orders",
    dated: true,
    method: "Purchase orders with an order date in the range. Total includes tax. Received % = units received ÷ units ordered.",
    columns: [
      { key: "number", label: "PO number", format: "mono" },
      { key: "vendor", label: "Vendor" },
      { key: "orderDate", label: "Order date", format: "date" },
      { key: "warehouse", label: "Warehouse" },
      { key: "status", label: "Status" },
      { key: "total", label: "Total", format: "currency", total: true },
      { key: "received", label: "Received", format: "percent" },
    ],
    defaultSort: { key: "orderDate", dir: "desc" },
    build: (d, f) =>
      d.purchaseOrders
        .filter((p) => inRange(p.orderDate, f) && (!f.warehouse || p.warehouseId === f.warehouse))
        .map((p) => {
          const vendor = d.vendors.find((v) => v.id === p.vendorId)?.name ?? "—";
          const ordered = sum(p.lines, (l) => l.quantity);
          return { _id: p.id, _search: `${p.number} ${vendor}`, number: p.number, vendor, orderDate: p.orderDate, warehouse: whName(d, p.warehouseId), status: PO_STATUS[p.status].label, total: docTotals(p.lines).total, received: ordered ? Math.round((sum(p.lines, (l) => l.received) / ordered) * 100) : 0 };
        }),
  },
  {
    id: "sales-orders",
    title: "Sales Orders",
    description: "Customer orders in a period with value and fulfilment status.",
    icon: ShoppingBagIcon,
    group: "Orders",
    dated: true,
    method: "Sales orders with an order date in the range. Total includes discounts and tax. Fulfilled % = units fulfilled ÷ units ordered.",
    columns: [
      { key: "number", label: "SO number", format: "mono" },
      { key: "customer", label: "Customer" },
      { key: "orderDate", label: "Order date", format: "date" },
      { key: "warehouse", label: "Warehouse" },
      { key: "status", label: "Status" },
      { key: "total", label: "Total", format: "currency", total: true },
      { key: "fulfilled", label: "Fulfilled", format: "percent" },
    ],
    defaultSort: { key: "orderDate", dir: "desc" },
    build: (d, f) =>
      d.salesOrders
        .filter((s) => inRange(s.orderDate, f) && (!f.warehouse || s.warehouseId === f.warehouse))
        .map((s) => {
          const customer = d.customers.find((c) => c.id === s.customerId)?.name ?? "—";
          const ordered = sum(s.lines, (l) => l.quantity);
          return { _id: s.id, _search: `${s.number} ${customer}`, number: s.number, customer, orderDate: s.orderDate, warehouse: whName(d, s.warehouseId), status: SO_STATUS[s.status].label, total: docTotals(s.lines).total, fulfilled: ordered ? Math.round((sum(s.lines, (l) => l.fulfilled) / ordered) * 100) : 0 };
        }),
  },
  {
    id: "warehouse-stock",
    title: "Warehouse-wise Stock",
    description: "SKUs, units, value and alerts for each warehouse.",
    icon: WarehouseIcon,
    group: "Stock",
    dated: false,
    method: "Current demo balances per warehouse. Value = on hand × item cost price. Alerts count active products at or below the warehouse reorder point.",
    columns: [
      { key: "name", label: "Warehouse" },
      { key: "code", label: "Code", format: "mono" },
      { key: "skus", label: "SKUs in stock", format: "number", total: true },
      { key: "units", label: "On hand", format: "number", total: true },
      { key: "reserved", label: "Reserved", format: "number", total: true },
      { key: "available", label: "Available", format: "number", total: true },
      { key: "value", label: "Value", format: "currency", total: true },
      { key: "alerts", label: "Low / out", format: "number", total: true },
    ],
    defaultSort: { key: "value", dir: "desc" },
    build: (d, f) =>
      d.warehouses
        .filter((w) => !f.warehouse || w.id === f.warehouse)
        .map((w) => {
          const s = warehouseStats(d.products, w.id);
          return { _id: w.id, _search: `${w.name} ${w.code} ${w.city}`, name: w.name, code: w.code, skus: s.skus, units: s.units, reserved: s.reserved, available: s.units - s.reserved, value: s.value, alerts: s.lowStock + s.outOfStock };
        }),
  },
  {
    id: "stock-adjustments",
    title: "Stock Adjustments",
    description: "Corrections in a period by reason, with their value at cost.",
    icon: SlidersHorizontalIcon,
    group: "Stock",
    dated: true,
    method: "Adjustment records dated in the range (posted history and drafts). Value impact = quantity change × item cost price.",
    columns: [
      { key: "number", label: "Reference", format: "mono" },
      { key: "date", label: "Date", format: "date" },
      { key: "name", label: "Product" },
      { key: "warehouse", label: "Warehouse" },
      { key: "reason", label: "Reason" },
      { key: "quantity", label: "Qty change", format: "signed", total: true },
      { key: "value", label: "Value impact", format: "currency", total: true },
      { key: "status", label: "Status" },
    ],
    defaultSort: { key: "date", dir: "desc" },
    build: (d, f) =>
      d.adjustments
        .filter((a) => inRange(a.createdAt, f) && (!f.warehouse || a.warehouseId === f.warehouse))
        .map((a) => {
          const p = d.products.find((x) => x.id === a.productId);
          return { _id: a.id, _search: `${a.number} ${p?.name} ${p?.sku}`, number: a.number, date: a.createdAt.slice(0, 10), name: p?.name ?? a.productId, warehouse: whName(d, a.warehouseId), reason: ADJUSTMENT_REASON[a.reason], quantity: a.quantity, value: a.quantity * (p?.costPrice ?? 0), status: a.status === "posted" ? "Posted" : "Draft" };
        }),
  },
  {
    id: "stock-ageing",
    title: "Stock Ageing",
    description: "How long stock has been sitting since it was last received.",
    icon: ClockCountdownIcon,
    group: "Value",
    dated: false,
    method: "Approximation: age = days since the most recent receipt of that product into that warehouse in the 120-day demo ledger (older stock shows as 120+). Value = on hand × item cost price.",
    columns: [
      { key: "sku", label: "SKU", format: "mono" },
      { key: "name", label: "Product" },
      { key: "warehouse", label: "Warehouse" },
      { key: "onHand", label: "On hand", format: "number", total: true },
      { key: "lastReceived", label: "Last received", format: "date" },
      { key: "days", label: "Days", format: "number" },
      { key: "bucket", label: "Age bucket" },
      { key: "value", label: "Value", format: "currency", total: true },
    ],
    defaultSort: { key: "days", dir: "desc" },
    build: (d, f) => {
      const today = d.movements[0]?.at.slice(0, 10) ?? addDays(new Date().toISOString().slice(0, 10), 0);
      const dayDiff = (a: string, b: string) => Math.round((new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime()) / 86_400_000);
      const rows: ReportRow[] = [];
      for (const p of live(d)) {
        for (const b of balances(p, f.warehouse)) {
          if (b.onHand <= 0) continue;
          const last = d.movements.find((m) => m.type === "received" && m.productId === p.id && m.to === b.warehouseId);
          const days = last ? dayDiff(today, last.at.slice(0, 10)) : 120;
          const bucket = !last ? "120+ days" : days <= 30 ? "0–30 days" : days <= 60 ? "31–60 days" : days <= 90 ? "61–90 days" : "91–120 days";
          rows.push({ _id: `${p.id}@${b.warehouseId}`, _search: `${p.name} ${p.sku}`, sku: p.sku, name: p.name, warehouse: whName(d, b.warehouseId), onHand: b.onHand, lastReceived: last ? last.at.slice(0, 10) : "", days, bucket, value: b.onHand * p.costPrice });
        }
      }
      return rows;
    },
  },
];

export const reportById = (id: string) => REPORTS.find((r) => r.id === id);
