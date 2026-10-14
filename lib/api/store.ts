/**
 * The single in-memory demo store behind every mock API module. Seeded on first
 * use from the fixed demo data; lives in this browser tab and resets on reload.
 */
import { seedBrands, seedCategories, seedCustomers, seedSettings, seedUsers, seedVendors, seedWarehouses } from "@/lib/mock-data/directory";
import { seedDocuments, type DocumentSeed } from "@/lib/mock-data/documents";
import { seedMovements } from "@/lib/mock-data/movements";
import { seedProducts } from "@/lib/mock-data/products";
import type { Product, StockMovement } from "@/lib/types/inventory";
import type { AppSettings, AppUser, CatalogEntry, CustomerRecord, VendorRecord, WarehouseRecord } from "@/lib/types/operations";

export interface Collections extends DocumentSeed {
  categories: CatalogEntry[];
  brands: CatalogEntry[];
  warehouses: WarehouseRecord[];
  vendors: VendorRecord[];
  customers: CustomerRecord[];
  users: AppUser[];
}

export type CollectionKey = keyof Collections;
export type RecordOf<K extends CollectionKey> = Collections[K][number];

let productStore: Product[] | null = null;
let movementStore: StockMovement[] | null = null;
let collectionStore: Collections | null = null;
let settingsStore: AppSettings | null = null;

export const products = () => (productStore ??= seedProducts());
export const movements = () => (movementStore ??= seedMovements(products()));

export function collections(): Collections {
  if (!collectionStore) {
    const customers = seedCustomers();
    collectionStore = {
      categories: seedCategories(),
      brands: seedBrands(),
      warehouses: seedWarehouses(),
      vendors: seedVendors(),
      customers,
      users: seedUsers(),
      ...seedDocuments(products(), movements(), customers.filter((c) => c.status === "active").map((c) => c.id)),
    };
  }
  return collectionStore;
}

export const settings = () => (settingsStore ??= seedSettings());
export const replaceSettings = (next: AppSettings) => {
  settingsStore = next;
};

/** Who is signed in to the demo. */
export const CURRENT_USER = "Admin User";

/** Simulated network latency. */
export const delay = (ms = 120 + Math.random() * 180) => new Promise((r) => setTimeout(r, ms));
export const clone = <T>(v: T): T => structuredClone(v);
