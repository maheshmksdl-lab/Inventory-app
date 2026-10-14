/** DEMO DATA — sample warehouses and vendors for the frontend prototype. */
import type { Vendor, Warehouse, WarehouseId } from "@/lib/types/inventory";

export const WAREHOUSES: Warehouse[] = [
  { id: "wh-main", name: "Main Warehouse", short: "Main", city: "Bengaluru" },
  { id: "wh-branch", name: "Branch Warehouse", short: "Branch", city: "Pune" },
  { id: "wh-remote", name: "Remote Warehouse", short: "Remote", city: "Hyderabad" },
];

export const WAREHOUSE_IDS = WAREHOUSES.map((w) => w.id);

export const warehouseById = (id: WarehouseId | string | null | undefined) => WAREHOUSES.find((w) => w.id === id);
export const warehouseName = (id: WarehouseId | string | null | undefined) => warehouseById(id)?.name ?? "—";

export const VENDORS: Vendor[] = [
  { id: "vn-apex", name: "Apex Distributors" },
  { id: "vn-northstar", name: "Northstar Supply Co." },
  { id: "vn-meridian", name: "Meridian Electronics" },
  { id: "vn-orbit", name: "Orbit Office Solutions" },
  { id: "vn-crestline", name: "Crestline Trading" },
];

export const vendorName = (id: string) => VENDORS.find((v) => v.id === id)?.name ?? "Unknown vendor";

/** Demo users who appear on stock movements and activity. */
export const USERS = ["John D.", "Sarah M.", "Mike L.", "Priya K.", "Admin User"];
